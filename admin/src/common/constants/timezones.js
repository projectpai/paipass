const timezone = {
    PST: 'PST',
    CST: 'CST',
    KST: 'KST',
    JST: 'JST',
    PACIFIC: 'PST',
    CHINESE: 'CST',
    KOREA: 'KST',
    JAPAN: 'JST',
};

const timezone_label = [
    { label: '(GMT -7:00) Pacific Time', value: timezone.PST },
    { label: '(GMT +8:00) China Standard Time', value: timezone.CST },
    { label: '(GMT +9:00) Korea Standard Time', value: timezone.KST },
    { label: '(GMT +9:00) Japan Standard Time', value: timezone.JST },
];

export { timezone, timezone_label };
