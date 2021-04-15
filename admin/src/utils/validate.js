export const removeWhiteSpaces = value => value.replace(/\s/g, '');

export const emailValidate = value => value.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

export const paiIdValidate = value => value.match(/^\d+$/);

export const searchValidate = value => value.match(/[a-zA-Z0-9!@#%._+-]$/);