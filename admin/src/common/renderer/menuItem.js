import React from 'react'; 
import { MenuItem } from '@blueprintjs/core';

export default function menuItemRenderer(item, { handleClick }) {
    return (
        <MenuItem
            key={item.key || item.value}
            text={item.label && item.label.length ? item.label : (<span>&nbsp;</span>)}
            onClick={handleClick}
            shouldDismissPopover
        />
    );
}
