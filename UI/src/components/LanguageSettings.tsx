import React from "react";
import { useT } from "../lib/l10n";
import { useLanguage, setLanguage } from "../lib/language";
import { Segmented } from "./common";
import s from "./panel.module.scss";

export function LanguageSettings() {
    const language = useLanguage();
    const { t } = useT();
    return <div className={s.subRow} data-testid="language-settings">
        <span>{t("Placemaker.UI.Language.Label", "Language")}</span>
        <Segmented testId="language" value={language} onChange={setLanguage} options={[
            { value: "system", label: t("Placemaker.UI.Language.System", "Follow game") },
            { value: "zh-HANS", label: "简体中文" },
            { value: "en-US", label: "English" },
        ]} />
    </div>;
}
