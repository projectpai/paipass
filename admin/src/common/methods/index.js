export const Methods = {
    doubleDigit:  digit => ('0' + digit).slice(-2),
    stringifyDate: date => {
        return `${date.getFullYear()}-${Methods.doubleDigit(date.getMonth() + 1)}-${Methods.doubleDigit(date.getDate())}T${Methods.doubleDigit(date.getHours())}:${Methods.doubleDigit(date.getMinutes())}:${Methods.doubleDigit(date.getSeconds())}`
    } 
};