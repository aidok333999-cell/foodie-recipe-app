const {test}=require('node:test');
const assert=require('node:assert/strict');
const {categories,recipes,toggleFavorite,validateRecipe,saveRecipe,deleteRecipe}=require('../model');
test('at least ten categories each have a complete recipe',()=>{
 assert.ok(categories.length>=10);
 for(const category of categories){const r=recipes.find(r=>r.category===category);assert.ok(r);for(const field of ['ingredients','instructions'])assert.ok(r[field].length);for(const field of ['time','servings','calories'])assert.ok(r[field]>0);assert.ok(r.difficulty);assert.ok(r.image);}
});
test('favorite toggles without duplicates',()=>{let ids=toggleFavorite([],'seed-0');assert.deepEqual(ids,['seed-0']);ids=toggleFavorite(ids,'seed-0');assert.deepEqual(ids,[]);});
test('create, edit and delete personal recipe, including its favorite',()=>{const r={...recipes[0],id:'mine-test'};let mine=saveRecipe([],r);assert.equal(mine.length,1);mine=saveRecipe(mine,{...r,name:'Edited'});assert.equal(mine.length,1);assert.equal(mine[0].name,'Edited');const result=deleteRecipe({mine,favorites:['mine-test','seed-1']},'mine-test');assert.deepEqual(result,{mine:[],favorites:['seed-1']});});
test('form rejects missing content and invalid numbers',()=>{const form={...recipes[0],ingredients:'bread',instructions:'toast',time:'10',servings:'2',calories:'300'};assert.equal(validateRecipe(form),'');for(const key of ['name','image','ingredients','instructions'])assert.ok(validateRecipe({...form,[key]:''}));for(const time of ['0','-2','abc','1.5','Infinity'])assert.ok(validateRecipe({...form,time}));});
