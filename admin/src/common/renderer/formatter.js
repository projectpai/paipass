import { TimePrecision } from '@blueprintjs/datetime';

export function dateFormatter(date, time=false) {
    const result = {
        formatDate: date => `${date.toLocaleDateString()}${time ? ' - ' + date.toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'}) :  ''}`,
        parseDate: str => new Date(str),
        placeholder: `D/M/YYYY${time ? ' - HH:MM' : ''}`,
        value: date
    };

    if (time) {
        result.timePrecision = TimePrecision.MINUTE;
    }

    return result;
}
