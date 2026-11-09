export type Language = 'ja' | 'en';

let currentLang: Language = 'ja';

export const dictionary = {
    ja: {
        startSession: '15分セッション開始',
        streak: '連続日数',
        estimatedPSI: '現在のPSI推定値',
        days: '日',
        dailyProgress: '本日の進捗',
        scientificMsg: '科学的に証明されたトレーニングでPSI向上中！',
        languageToggle: '🇬🇧 English',
        results: '総合結果',
        accuracy: '正答率',
        reactionTime: '平均反応時間',
        nextGame: '次のゲームへ',
        sessionComplete: 'セッション完了！',
        finish: '終了',
    },
    en: {
        startSession: 'Start 15-min Session',
        streak: 'Streak',
        estimatedPSI: 'Estimated PSI',
        days: 'days',
        dailyProgress: 'Daily Progress',
        scientificMsg: 'Improving PSI with scientifically proven training!',
        languageToggle: '🇯🇵 日本語',
        results: 'Overall Results',
        accuracy: 'Accuracy',
        reactionTime: 'Avg RT',
        nextGame: 'Next Game',
        sessionComplete: 'Session Complete!',
        finish: 'Finish',
    }
};

export function setLanguage(lang: Language) {
    currentLang = lang;
}

export function getLanguage() {
    return currentLang;
}

export function t(key: keyof typeof dictionary['ja']): string {
    return dictionary[currentLang][key];
}
