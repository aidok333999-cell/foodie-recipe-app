import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { categories, recipes, toggleFavorite, validateRecipe, saveRecipe, deleteRecipe } from './model';

const KEY = 'foodie-v1';
const initial = { mine: [], favorites: [] };
const empty = () => ({ name: '', image: '', category: 'Breakfast', ingredients: '', instructions: '', time: '20', servings: '2', calories: '300', difficulty: 'Easy' });
const icons = ['☀','🍝','🥗','🍲','🍗','🐟','🥕','🌱','🍓','🥜','🥐','🥤'];

function Button({ children, onPress, secondary, danger, ...props }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[s.button, secondary && s.secondary, danger && s.danger]} {...props}><Text style={[s.buttonText, secondary && { color: '#235b40' }]}>{children}</Text></Pressable>;
}
function Photo({ uri, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return failed || !uri ? <View style={[style, s.photoFallback]}><Text style={{fontSize:48}}>🍽️</Text><Text>Made with love</Text></View> : <Image source={{ uri }} style={style} onError={() => setFailed(true)} accessibilityLabel="Recipe photo" />;
}

export default function App() {
  const [data, setData] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [tab, setTab] = useState('Discover');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [stack, setStack] = useState([{ type: 'list' }]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const queue = useRef(Promise.resolve());
  const screen = stack[stack.length - 1];
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      if (!active || !raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.mine) || !Array.isArray(parsed.favorites)) throw new Error('Invalid saved data');
      setData(parsed);
    }).catch(() => { if(active) setStorageError('Saved data could not be loaded. This session still works; changes may replace older saved data.'); }).finally(() => { if(active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    queue.current = queue.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(data))).then(() => setStorageError('')).catch(() => setStorageError('Changes are in memory but could not be saved on this device. Free some storage and try again.'));
  }, [data, loaded]);
  function back() { setStack(p => p.length > 1 ? p.slice(0, -1) : p); }
  function leave() {
    if(screen.type !== 'form') { back(); return; }
    if(Platform.OS === 'web') { if(window.confirm('Discard unsaved recipe changes?')) back(); }
    else Alert.alert('Discard changes?', 'Your unsaved recipe changes will be lost.', [{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:back}]);
  }
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if(stack.length > 1) { leave(); return true; } return false; });
    return () => sub.remove();
  }, [stack]);
  const all = [...data.mine, ...recipes];
  const selected = all.find(r => r.id === screen.id);
  const isMine = id => data.mine.some(r => r.id === id);
  function favorite(id) { setData(p => ({...p, favorites: toggleFavorite(p.favorites,id)})); }
  function openForm(recipe) {
    setForm(recipe ? {...recipe, time:String(recipe.time), servings:String(recipe.servings), calories:String(recipe.calories), ingredients:recipe.ingredients.join('\n'), instructions:recipe.instructions.join('\n')} : empty());
    setError(''); setStack(p => [...p, {type:'form'}]);
  }
  function remove(id) {
    const perform = () => { setData(p => deleteRecipe(p,id)); setStack(p => p.filter(x => x.id !== id)); };
    if(Platform.OS === 'web') { if(window.confirm('Delete this recipe permanently?')) perform(); }
    else Alert.alert('Delete recipe?', 'This also removes it from Favorites.', [{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:perform}]);
  }
  async function pickImage() {
    try {
      // On web the picker must launch directly from the user's button press.
      if(Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if(!permission.granted) {setError('Photo access is needed. Allow it in your device settings and try again.');return;}
      }
      const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[4,3],quality:0.65,base64:true});
      if(!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if(!asset.base64) {setError('Could not read the photo. Please choose another image.');return;}
        if(asset.base64.length > 1800000) {setError('Please choose a smaller photo (under about 1.3 MB) so it can be saved reliably.');return;}
        setForm(p=>({...p,image:`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`}));setError('');
      }
    } catch(e) {setError('Unable to open the photo library. Please try again.');}
  }
  function save() {
    const message = validateRecipe(form); if(message) {setError(message);return;}
    const recipe = {...form, id:form.id || `mine-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name:form.name.trim(), time:Number(form.time), servings:Number(form.servings), calories:Number(form.calories), ingredients:form.ingredients.split('\n').map(x=>x.trim()).filter(Boolean), instructions:form.instructions.split('\n').map(x=>x.trim()).filter(Boolean)};
    setData(p=>({...p,mine:saveRecipe(p.mine,recipe)})); setTab('My Food');setCategory('My Food');setStack([{type:'list'},{type:'detail',id:recipe.id}]);
  }
  function navigate(next) {setTab(next);setCategory(next==='My Food'?'My Food':'All');setQuery('');setStack([{type:'list'}]);}
  function chooseCategory(next) {setCategory(next);setTab(next==='My Food'?'My Food':'Discover');setQuery('');}
  function heart(r) {const active=data.favorites.includes(r.id);return <Pressable accessibilityRole="button" accessibilityLabel={`${active?'Unfavorite':'Favorite'} ${r.name}`} accessibilityState={{selected:active}} onPress={()=>favorite(r.id)} style={s.heart}><Text style={{fontSize:25,color:active?'#bf493d':'#27563e'}}>{active?'♥':'♡'}</Text></Pressable>;}
  const visible = (tab==='Favorites'?all.filter(r=>data.favorites.includes(r.id)):tab==='My Food'?data.mine:all.filter(r=>category==='All'||r.category===category)).filter(r=>r.name.toLowerCase().includes(query.toLowerCase()));
  if(!loaded) return <SafeAreaView style={s.safe}><Text style={s.loading}>Getting your kitchen ready…</Text></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="dark-content" backgroundColor="#faf8f2" />
    <View style={s.shell}>
      <View style={s.header}><View><Text style={s.brand}>foodie<Text style={{color:'#dc7d4b'}}>.</Text></Text><Text style={s.kicker}>A LITTLE INSPIRATION. EVERY DAY.</Text></View><View style={s.avatar}><Text style={{fontSize:23}}>🌿</Text></View></View>
      {!!storageError && <Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
      {screen.type !== 'list' && <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={leave} style={s.back}><Text style={s.link}>← Back</Text></Pressable>}
      {screen.type==='list' && <>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.eyebrow}>{tab==='Discover'?'FROM OUR KITCHEN TO YOURS':tab==='Favorites'?'YOUR PERSONAL COOKBOOK':'CREATE SOMETHING DELICIOUS'}</Text>
          <Text style={s.title}>{tab==='Discover'?'Good food,\ngood mood.':tab==='Favorites'?'Made to be\nsaved.':'Your kitchen,\nyour recipes.'}</Text>
          <Text style={s.subtitle}>{tab==='Discover'?'Find your next favorite, one delicious idea at a time.':tab==='Favorites'?'All the recipes you love, together in one place.':'Keep your own creations close at hand.'}</Text>
          <TextInput accessibilityLabel="Search recipes" placeholder="Search for something delicious…" placeholderTextColor="#7d8278" value={query} onChangeText={setQuery} style={s.search}/>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>
            {['All',...categories,'My Food'].map((c,i)=><Pressable accessibilityRole="button" accessibilityState={{selected:category===c}} key={c} onPress={()=>chooseCategory(c)} style={[s.chip,category===c&&s.activeChip]}><Text style={[s.chipText,category===c&&s.activeChipText]}>{c==='All'?'✦':c==='My Food'?'＋':icons[i-1]}  {c}</Text></Pressable>)}
          </ScrollView>
          {tab==='My Food' && <Button onPress={()=>openForm()}>＋ Add New Recipe</Button>}
          <View style={s.sectionRow}><Text style={s.sectionTitle}>{tab==='My Food'?'My Recipes':tab==='Favorites'?'Favorites':category==='All'?'Fresh inspiration':category}</Text><Text style={s.muted}>{visible.length} recipes</Text></View>
          {!visible.length && <View style={s.empty}><Text style={{fontSize:40}}>🍽️</Text><Text style={s.sectionTitle}>{query?'No recipes found':tab==='Favorites'?'A place for your favorites':'Your cookbook starts here'}</Text><Text style={s.subtitle}>{query?'Try another search or category.':tab==='Favorites'?'Tap the heart on any recipe to save it here.':'Tap Add New Recipe to share your first creation.'}</Text></View>}
          <View style={s.grid}>{visible.map(r=><View key={r.id} style={s.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${r.name}`} onPress={()=>setStack(p=>[...p,{type:'detail',id:r.id}])}><Photo uri={r.image} style={s.cardPhoto}/><View style={s.cardBody}><Text style={s.eyebrow}>{r.category.toUpperCase()}</Text><Text style={s.cardTitle}>{r.name}</Text><Text style={s.muted}>{r.time} min  ·  {r.difficulty}  ·  {r.calories} kcal</Text></View></Pressable>
            <View style={s.cardHeart}>{heart(r)}</View>
            {isMine(r.id)&&<View style={s.actions}><Button secondary onPress={()=>openForm(r)}>Edit</Button><Button danger onPress={()=>remove(r.id)}>Delete</Button></View>}
          </View>)}</View>
          <Text style={s.footer}>A little homemade happiness.</Text>
        </ScrollView>
        <View style={s.nav}>{[['Discover','⌂'],['Favorites','♡'],['My Food','＋']].map(([label,icon])=><Pressable accessibilityRole="button" accessibilityState={{selected:tab===label}} key={label} onPress={()=>navigate(label)} style={s.navItem}><Text style={[s.navIcon,tab===label&&s.navActive]}>{icon}</Text><Text style={[s.navLabel,tab===label&&s.navActive]}>{label}</Text></Pressable>)}</View>
      </>}
      {screen.type==='detail' && selected && <ScrollView contentContainerStyle={s.content}>
        <View><Photo uri={selected.image} style={s.heroPhoto}/><View style={s.cardHeart}>{heart(selected)}</View></View>
        <Text style={[s.eyebrow,{marginTop:24}]}>{selected.category.toUpperCase()}</Text><Text style={s.detailTitle}>{selected.name}</Text>
        <View style={s.stats}>{[['Preparation time',`${selected.time} min`],['Servings',selected.servings],['Calories',`${selected.calories} kcal`],['Difficulty',selected.difficulty]].map(([label,value])=><View key={label} style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.muted}>{label}</Text></View>)}</View>
        <Text style={s.sectionTitle}>Ingredients</Text>{selected.ingredients.map((x,i)=><View key={i} style={s.ingredient}><Text style={{color:'#d37b47'}}>●</Text><Text style={s.body}>{x}</Text></View>)}
        <Text style={[s.sectionTitle,{marginTop:28}]}>Instructions</Text>{selected.instructions.map((x,i)=><View key={i} style={s.step}><View style={s.stepNumber}><Text style={s.link}>{i+1}</Text></View><Text style={[s.body,{flex:1}]}>{x}</Text></View>)}
        {isMine(selected.id)&&<View style={s.actions}><Button secondary onPress={()=>openForm(selected)}>Edit Recipe</Button><Button danger onPress={()=>remove(selected.id)}>Delete Recipe</Button></View>}
        <Text style={s.footer}>Nutrition values are approximate, per serving.</Text>
      </ScrollView>}
      {screen.type==='form' && <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>FROM YOUR OWN KITCHEN</Text><Text style={s.detailTitle}>{form.id?'Edit Recipe':'Add New Recipe'}</Text>
        <Text style={s.subtitle}>Make it yours. Ingredients and steps go on separate lines.</Text>
        <Field label="Recipe name" value={form.name} onChangeText={name=>setForm(p=>({...p,name}))} placeholder="e.g. Grandma’s lemon cake"/>
        <Text style={s.label}>Recipe photo</Text>{!!form.image&&<Photo uri={form.image} style={s.formPhoto}/>}<Button secondary onPress={pickImage}>{form.image?'Change photo':'Upload image'}</Button>
        <Text style={s.label}>Category</Text><View style={s.wrap}>{categories.map(c=><Pressable key={c} accessibilityRole="button" accessibilityState={{selected:form.category===c}} onPress={()=>setForm(p=>({...p,category:c}))} style={[s.chip,form.category===c&&s.activeChip]}><Text style={[s.chipText,form.category===c&&s.activeChipText]}>{c}</Text></Pressable>)}</View>
        <Field label="Ingredients (one per line)" multiline value={form.ingredients} onChangeText={ingredients=>setForm(p=>({...p,ingredients}))} placeholder={'2 cups flour\n1 lemon'}/>
        <Field label="Step-by-step instructions (one step per line)" multiline value={form.instructions} onChangeText={instructions=>setForm(p=>({...p,instructions}))} placeholder={'Preheat oven to 180°C.\nMix the ingredients.'}/>
        {[['time','Preparation time (minutes)'],['servings','Number of servings'],['calories','Calories per serving (kcal)']].map(([key,label])=><Field key={key} label={label} keyboardType="number-pad" value={form[key]} onChangeText={value=>setForm(p=>({...p,[key]:value}))}/>)}
        <Text style={s.label}>Difficulty level</Text><View style={s.wrap}>{['Easy','Medium','Hard'].map(d=><Pressable accessibilityRole="button" accessibilityState={{selected:form.difficulty===d}} key={d} style={[s.chip,form.difficulty===d&&s.activeChip]} onPress={()=>setForm(p=>({...p,difficulty:d}))}><Text style={[s.chipText,form.difficulty===d&&s.activeChipText]}>{d}</Text></Pressable>)}</View>
        {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button onPress={save}>Save Recipe</Button><View style={{height:24}}/><Button secondary onPress={leave}>Cancel</Button>
      </ScrollView></KeyboardAvoidingView>}
    </View>
  </SafeAreaView>;
}
function Field({label,multiline,...props}) {return <View style={{marginTop:18}}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} multiline={multiline} style={[s.input,multiline&&{minHeight:115,textAlignVertical:'top'}]} placeholderTextColor="#85877e" {...props}/></View>;}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#faf8f2',paddingTop:Platform.OS==='android'?StatusBar.currentHeight:0},shell:{flex:1,width:'100%',maxWidth:920,alignSelf:'center'},header:{paddingHorizontal:24,paddingVertical:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#e7e7db'},brand:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:38,fontWeight:'bold',color:'#235b40',letterSpacing:-2},kicker:{fontSize:8,letterSpacing:1.8,color:'#6a7668',marginTop:2},avatar:{width:44,height:44,borderRadius:22,backgroundColor:'#e9eddf',alignItems:'center',justifyContent:'center'},content:{padding:24,paddingBottom:40},eyebrow:{color:'#a66b3f',fontSize:10,fontWeight:'700',letterSpacing:1.6},title:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:47,lineHeight:52,color:'#244c37',marginVertical:14,letterSpacing:-1.4},subtitle:{fontSize:14,lineHeight:22,color:'#777e70',marginBottom:18,marginTop:5},search:{backgroundColor:'#eeeee5',borderRadius:14,padding:16,fontSize:14,color:'#254b37',marginTop:7},categories:{gap:9,paddingVertical:22},chip:{paddingVertical:11,paddingHorizontal:15,borderWidth:1,borderColor:'#dedfd2',borderRadius:24,backgroundColor:'#faf8f2'},activeChip:{backgroundColor:'#265b40',borderColor:'#265b40'},chipText:{color:'#596550',fontSize:12,fontWeight:'600'},activeChipText:{color:'#fff'},sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginVertical:21},sectionTitle:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:23,color:'#284831',fontWeight:'600'},muted:{fontSize:11,color:'#78806e',lineHeight:18},grid:{flexDirection:'row',flexWrap:'wrap',gap:18},card:{width:'100%',maxWidth:410,flexGrow:1,flexBasis:260,backgroundColor:'#fff',borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:'#e8e8dc'},cardPhoto:{width:'100%',height:190},cardBody:{padding:18,gap:8},cardTitle:{fontSize:20,fontFamily:Platform.OS==='ios'?'Georgia':'serif',color:'#294b36',lineHeight:26},cardHeart:{position:'absolute',right:12,top:12},heart:{width:42,height:42,borderRadius:21,backgroundColor:'#faf8f2',alignItems:'center',justifyContent:'center'},nav:{flexDirection:'row',borderTopWidth:1,borderTopColor:'#dedfd2',backgroundColor:'#faf8f2',paddingVertical:12},navItem:{flex:1,alignItems:'center',gap:3},navIcon:{fontSize:25,color:'#92988b'},navLabel:{fontSize:11,color:'#92988b'},navActive:{color:'#245d40',fontWeight:'700'},back:{paddingHorizontal:24,paddingTop:16},link:{color:'#265b40',fontWeight:'700',fontSize:15},heroPhoto:{width:'100%',height:290,borderRadius:22},detailTitle:{fontSize:35,lineHeight:41,color:'#244c37',fontFamily:Platform.OS==='ios'?'Georgia':'serif',marginVertical:14},stats:{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:28,marginTop:8},stat:{backgroundColor:'#eeeee3',borderRadius:13,padding:15,minWidth:115,flexGrow:1},statValue:{fontSize:18,fontWeight:'700',color:'#28553b',marginBottom:4},ingredient:{flexDirection:'row',gap:12,paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#e7e7dc'},body:{fontSize:15,lineHeight:24,color:'#4f594a',flexShrink:1},step:{flexDirection:'row',gap:14,marginTop:18},stepNumber:{width:32,height:32,borderRadius:16,backgroundColor:'#e7ebdc',alignItems:'center',justifyContent:'center'},button:{backgroundColor:'#265b40',paddingVertical:14,paddingHorizontal:20,borderRadius:13,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700',fontSize:14},secondary:{backgroundColor:'#e8ecdf'},danger:{backgroundColor:'#a33e36'},actions:{flexDirection:'row',gap:12,padding:16,flexWrap:'wrap'},label:{fontSize:13,color:'#33543b',fontWeight:'700',marginBottom:9,marginTop:10},input:{borderWidth:1,borderColor:'#d9ddce',backgroundColor:'#fff',padding:14,borderRadius:12,fontSize:15,color:'#294b36'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},formPhoto:{width:'100%',height:180,borderRadius:15,marginBottom:12},error:{padding:14,backgroundColor:'#f9e4dd',color:'#913e30',marginVertical:12,borderRadius:10},empty:{padding:25,alignItems:'center',gap:12},footer:{textAlign:'center',color:'#8b927f',fontSize:12,marginTop:30},loading:{padding:40,color:'#265b40'},photoFallback:{backgroundColor:'#e8ebdb',alignItems:'center',justifyContent:'center'}
});
