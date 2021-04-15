import Async from './middleware/async';
import Video from './components/video';
import Timer from './components/timer';
import Tabs from './components/tabs';
import MobilePreview from './components/mobile-preview';
import FormConfirm from './components/form/form-confirm';
import Notification from './components/notification';
import StatusIndicator from './components/status-indicator';

import DataManager from './data-manager';
import * as Renderer from './renderer';
import { Methods } from './methods';

import { DialogProvider, DialogConsumer, DialogRoot } from './contexts/dialog-context';

export {
    Video,
    Timer,
    Tabs,
    DataManager,
    FormConfirm,
    MobilePreview,
    DialogRoot,
    DialogProvider,
    DialogConsumer,
    Notification,
    Renderer,
    Methods,
    StatusIndicator
}

export const middleware = [
    Async,
];


