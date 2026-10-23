import { expect, test } from "@playwright/test";
import { open, drawPolygon, FIELD, pickType, waitPlanned, noTextOverflow } from "./helpers";

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
        await noTextOverflow(page,"Chinese " + id);
        await page.getByTestId("placemaker-panel").screenshot({path:testInfo.outputPath(id+"-zh.png")});
        await page.getByTestId("language-en-US").click();
        await expect(page.getByTestId("language-system")).toHaveText("Follow game");
    });
}
