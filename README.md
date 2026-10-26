# Foodie

A complete React Native Expo recipe app for Android, iOS and web. Browse twelve food categories, save favorites, and create your own illustrated cookbook.

## Review this project in Expo Snack

Public repository: https://github.com/aidok333999-cell/foodie-recipe-app

1. Open https://snack.expo.dev.
2. Open the three-dot menu beside **Project**, then **Import git repository**.
3. Paste the public repository URL above and import the root directory.
4. Select **Expo v55.0.0** in the SDK selector at the bottom if needed. Let dependencies finish loading.
5. Choose **Web**, or use **Run on device** with an Expo Go version supporting SDK 55. For current Expo Go versions that no longer support SDK 55, use Snack Web or an SDK-compatible development client.

The root `App.js`, `model.js` and `package.json` use standard Snack-compatible imports. No environment variables, backend, account or API keys are needed. Recipe images need internet; a placeholder appears if they cannot load. The image picker is supported on web and mobile; native devices may request photo access.

## Run locally

Use Node 20.19+ and npm, or pnpm:

```sh
npm install
npm start
# press w for web, or scan the QR code with a compatible Expo Go
npm test
```

With pnpm: `pnpm install`, `pnpm start`, `pnpm test`. Production web build: `npx expo export --platform web`. Compatibility check: `npx expo install --check`.

## Twelve-item reviewer walkthrough

| Task | How to check |
| --- | --- |
| 1. Public GitHub / Snack import | Import the repository URL using the steps above. |
| 2. 10+ horizontal categories | Scroll the category strip: Breakfast, Pasta, Salads, Soups, Chicken, Seafood, Vegetarian, Vegan, Desserts, Snacks, Baking, Drinks. |
| 3. Six detail fields | Open any recipe: ingredients, instructions, preparation time, servings, calories and difficulty. |
| 4. Category filtering | Select Pasta; Lemon basil pasta appears. Select another category or All. |
| 5. Heart toggle | Tap a recipe heart, then tap again; its state changes both times. |
| 6. Favorites section | Favorite a recipe and open Favorites in the bottom navigation. |
| 7. My Food and Add | Scroll the category strip to My Food, then tap Add New Recipe. The bottom navigation also opens My Food. |
| 8. Add form and Save | Enter name, upload a small photo, enter ingredients and one instruction per line. Complete metadata and tap Save Recipe. |
| 9. My Recipes list | Tap Back after saving; the recipe appears under My Recipes. |
| 10. Personal recipe details | Open your recipe to see its name, image, ingredients, instructions and metadata. |
| 11. Edit and Delete | Edit the recipe and save; verify updated content. Delete it and confirm; it disappears from My Recipes and Favorites. |
| 12. Back navigation | Use the visible Back button on details and forms; Cancel also leaves a form. Android hardware Back is handled. |

Favorites begin empty so reviewers can verify the toggle themselves. Custom recipes and favorites persist on the same device/browser using AsyncStorage. Uploaded photos are stored as data URLs so temporary picker URIs do not break on reload; choose photos below about 1.3 MB. Storage errors are displayed. There is no cloud sync. Deletion asks for confirmation. Nutrition figures in sample recipes are approximate per serving.

## Verification

Four automated model tests cover category completeness, favorite toggling, create/edit/delete including favorite cleanup, and form validation. Expo dependency compatibility and production web bundling were checked successfully. A physical iOS/Android device has not been tested. Consult `VERIFICATION.md` for final browser and Snack verification status.

## Structure

- `App.js`: responsive UI, navigation, forms, image picker and persistence.
- `model.js`: twelve recipes and pure recipe operations.
- `tests/model.test.js`: automated recipe tests.
- `app.json`: Expo configuration.

Sample food photography is served from Unsplash; it is illustrative and may not depict the exact recipe.
