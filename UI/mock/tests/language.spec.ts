import { expect, test } from "@playwright/test";
import { open, drawPolygon, FIELD, pickType, waitPlanned, noTextOverflow } from "./helpers";
import locales from "../locales";
import { FAKE_LAYERS, FAKE_FEATURES, FAKE_RECIPES, FAKE_STRINGS } from "../backend/fakeCatalog";
import { fakeAssets } from "../backend/fakeAssets";
import assetNames from "../asset-names.zh-HANS.json";

test("all simulated asset names have Chinese translations", () => {
    const categories = ["tree", "net.pathway", "net.road", "centerpiece", "bench", "fence", "playground", "surface", "decal", "unknown"];
    for (const category of categories) for (const asset of fakeAssets(category))
        expect((assetNames as Record<string, string>)[asset.name], asset.name).toMatch(/[\u3400-\u9fff]/);
});

test("all mock catalog labels, options, presets and hints have Chinese translations", () => {
    const keys = new Set(Object.keys(FAKE_STRINGS));
    const collect = (value: unknown) => {
        if (typeof value === "string" && value.startsWith("Placemaker.")) keys.add(value);
        else if (value && typeof value === "object") Object.values(value).forEach(collect);
    };
    collect([FAKE_LAYERS, FAKE_FEATURES, FAKE_RECIPES]);
    const zh = locales["zh-HANS"] as Record<string, string>;
    const en = locales["en-US"] as Record<string, string>;
    for (const key of keys) {
        expect(zh[key], key).toBeTruthy();
        if (/[a-z]/i.test(en[key] ?? "")) expect(zh[key], key).toMatch(/[\u3400-\u9fff]/);
        expect((zh[key].match(/\{[^}]+\}/g) ?? []).sort(), key)
            .toEqual((en[key]?.match(/\{[^}]+\}/g) ?? []).sort());
    }
});

test("panel language switches immediately and survives reload", async ({ page }) => {
    await open(page);
    await expect(page.getByTestId("language-system")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("language-zh-HANS").click();
    await expect(page.getByTestId("language-system")).toHaveText("跟随游戏");
    await page.reload();
    await expect(page.getByTestId("language-zh-HANS")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("language-system")).toHaveText("跟随游戏");
    await page.getByTestId("language-en-US").click();
    await expect(page.getByTestId("language-system")).toHaveText("Follow game");
    await page.getByTestId("language-system").click();
    await expect(page.getByTestId("language-system")).toHaveAttribute("aria-pressed", "true");
});

for (const [id,label] of [["park","公园"],["parking","停车场"],["roads","道路"],["plaza","广场"]]) {
    test("Chinese panel: " + id, async ({page}, testInfo) => {
        await open(page);
        await page.getByTestId("language-zh-HANS").click();
        await drawPolygon(page, FIELD);
        await page.getByTestId("primary").click();
        await pickType(page,id);
        await waitPlanned(page);
        await expect(page.getByTestId("recipe-"+id)).toContainText(label);
        const shape = page.getByTestId("shape");
        const folds = await shape.locator('[data-testid$="-toggle"][aria-expanded="false"]')
            .evaluateAll(elements => elements.map(element => element.getAttribute("data-testid")!));
        for (const id of folds) await shape.getByTestId(id).click();
        if (id === "park" || id === "roads") {
            const labels = id === "park"
                ? ["风格", "步道宽度", "树木密度", "长椅与路灯", "树种", "池塘大小"]
                : ["路网布局", "街区大小", "道路类型", "旋转角度", "沿边缘修路", "尽端路"];
            for (const label of labels) await expect(shape.getByText(label, { exact: true })).toBeVisible();
            const presets = id === "park" ? ["规整花园", "野生草甸", "池塘公园"] : ["密集网格", "郊区"];
            for (const label of presets) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
            await expect(shape).not.toContainText(/Style|Pattern|Path width|Tree density|Furniture|Block size|Cul de sacs/);
        }
        if (id === "park") {
            const extras = page.getByTestId("feature-grid");
            for (const name of ["游乐场", "喷泉", "公共厕所", "大树"])
                await expect(extras.getByText(name, { exact: true })).toBeVisible();
            await expect(extras.getByText("Name", { exact: true })).toHaveCount(0);
        }
        await noTextOverflow(page,"Chinese " + id);
        await page.getByTestId("placemaker-panel").screenshot({path:testInfo.outputPath(id+"-zh.png")});
        if (id === "plaza") {
            const arrangement = page.getByTestId("arrangement-arrangement");
            await expect(arrangement).toContainText("木制长椅");
            await expect(arrangement).toContainText("方形花箱");
            await expect(arrangement).not.toContainText(/Wooden Bench|Square Planter/);
            await page.getByTestId("arrangement-add-arrangement").click();
            await expect(page.getByTestId("asset-bench-wood")).toContainText("木制长椅");
            await expect(page.getByTestId("asset-planter-square")).toContainText("方形花箱");
            await page.getByTestId("asset-search").fill("木制");
            await expect(page.getByTestId("asset-bench-wood")).toBeVisible();
            await expect(page.getByTestId("asset-planter-square")).toHaveCount(0);
            await page.getByTestId("asset-picker-close").click();
            await page.getByTestId("language-en-US").click();
            await expect(arrangement).toContainText("Wooden Bench");
            await expect(arrangement).toContainText("Square Planter");
            await page.getByTestId("language-zh-HANS").click();
            await expect(arrangement).toContainText("木制长椅");
        }
        await page.getByTestId("language-en-US").click();
        await expect(page.getByTestId("language-system")).toHaveText("Follow game");
    });
}
