import React from 'react';
import FlexView from 'react-flexview';
import { Button, H4, TextArea, Intent, InputGroup } from '@blueprintjs/core';
import { DateInput } from '@blueprintjs/datetime';
import { Select } from '@blueprintjs/select';

import { Renderer } from '../../common';
import { timezone_label } from '../../common/constants';

import './region.scss';

const Region = ({ handleChange, handlePreview, message }) => {
    return (
        <FlexView column className="region">
            <InputGroup 
                name="title"
                placeholder="Message title"
                value={message.title}
                onChange={handleChange}
            />

            <FlexView marginTop="16px" />
        
            <TextArea
                large
                name="content"
                placeholder="Message body"
                intent={Intent.PRIMARY}
                onChange={handleChange}
                value={message.content}
            />
    
            {   // TODO preview not completed
                //<div>
                //   <Button minimal intent={Intent.PRIMARY} text="Preview" onClick={handlePreview} />
                //</div>
            }
    
            <FlexView column marginTop="32px">
                <FlexView vAlignContent="center" marginBottom="16px">
                    <H4>Choose time</H4>
                    <Select
                        items={timezone_label}
                        itemRenderer={Renderer.menuItemRenderer}
                        filterable={false}
                        onItemSelect={item => handleChange({ target: { name: 'timezone', value: item.value } })}
                    >
                        <span className="timezone">{timezone_label.find(tz => message.timezone === tz.value).label}</span>
                    </Select>
                </FlexView>
                
                <FlexView wrap vAlignContent="center">   
                    <FlexView column marginTop="8px" marginRight="16px" width="216px">
                        <FlexView marginRight="16px" marginTop="6px">Start time</FlexView>
                        <DateInput
                            name="available_from"
                            id="message-region-start-time"
                            {...Renderer.Formatter.dateFormatter(message.available_from, true)}
                            onChange={date => { handleChange({ target: { name: 'available_from', value: date } })}}/>
                    </FlexView>
                    
                    <FlexView column marginTop="8px" width="216px">
                        <FlexView marginRight="16px" marginTop="6px">End time</FlexView>
                        <DateInput
                            name="available_to"
                            id="message-region-end-time"
                            {...Renderer.Formatter.dateFormatter(message.available_to, true)}
                            onChange={date => { handleChange({ target: { name: 'available_to', value: date } })}}/>
                    </FlexView>
                </FlexView>
            </FlexView>
        </FlexView>
    );
}

export default Region;
