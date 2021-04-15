import { Position, Toaster, Intent } from "@blueprintjs/core";

/** Singleton toaster instance. Create separate instances for different options. */
const toaster = Toaster.create({
    position: Position.BOTTOM,
});

export default class Notification {

    static show(message) { 
        toaster.show({ message, intent: Intent.PRIMARY});
    }

    static showSuccess(message) { 
        toaster.show({ message, intent: Intent.SUCCESS, icon: "tick"});
    }

    static showWarning(message) { 
        toaster.show({ message, intent: Intent.WARNING, icon: "warning-sign"});
    }

    static showError(message) {
        toaster.show({ message, intent: Intent.DANGER});
    }
}