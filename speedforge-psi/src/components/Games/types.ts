export interface GameProps {
    level: number;
    onFinish: (result: { accuracy: number; avgRT: number; totalTrials: number }) => void;
    onLevelChange?: (isCorrect: boolean) => void;
}
