import { OptionText } from "./valueObjects/OptionText";

export interface OptionProps {
    id?: string;
    text: OptionText;
    correct: boolean;
}

export class Option {
    public readonly id?: string;
    public readonly text: OptionText;
    public readonly correct: boolean;

    constructor(props: OptionProps) {
        this.id = props.id;
        this.text = props.text;
        this.correct = props.correct;
    }

    public updateText(newText: OptionText): Option {
        return new Option({ ...this, text: newText });
    }

    public toggleCorrect(isCorrect: boolean): Option {
        return new Option({ ...this, correct: isCorrect });
    }
}
