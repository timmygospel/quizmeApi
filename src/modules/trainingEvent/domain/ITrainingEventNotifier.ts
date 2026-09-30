// Tells open browsers that something about a training event changed, so they refetch — no data is
// pushed, only a nudge, which keeps the (public) socket room harmless.
//   checksChanged: a check opened/closed or the event ended — attendees' screens refresh
//   progress:      someone joined or submitted — the trainer's live counts refresh
export interface ITrainingEventNotifier {
    checksChanged(joinCode: string): void;
    progress(joinCode: string): void;
}

export const silentNotifier: ITrainingEventNotifier = {
    checksChanged: () => { },
    progress: () => { },
};
