// Only the browser mock uses these legacy/demo controls. Keep their translations
// out of the shipped game dictionary; current game keys always take precedence.
import shipped from "../src/lang/locales.generated.json";
import { FAKE_STRINGS } from "./backend/fakeCatalog";
import chinese from "./zh-HANS.json";

export default {
    "en-US": { ...FAKE_STRINGS, ...shipped["en-US"] },
    "zh-HANS": { ...chinese, ...shipped["zh-HANS"] },
};
