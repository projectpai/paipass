import React, { Fragment } from 'react';
import FlexView from 'react-flexview';
import { Button, Intent, Position, Tooltip } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { DateInput, TimePrecision } from '@blueprintjs/datetime';

import { language, language_label, timezone_label } from '../../../../common/constants';
import { Methods, Renderer, DialogConsumer, DataManager, StatusIndicator } from '../../../../common';
import Dialog from '../../dialog';

const Filter = {
    Published: ({ onChange, table }) => (
        <FlexView>
            <DateInput 
                popoverProps={{ position: Position.BOTTOM }}
                {...Renderer.Formatter.dateFormatter(table.dateTime)}
                timePrecision={TimePrecision.MINUTE}
                onChange={date => { onChange({ target: { name: 'datetime', value: date } })}}
            />

            <Select
                items={[{ label: 'None', value: null }, ...timezone_label]}
                itemRenderer={Renderer.menuItemRenderer}
                filterable={false}
                onItemSelect={item => onChange({ target: { name: 'timezone', value: item.value } })}
            >
                <Button intent={Intent.PRIMARY} minimal className="timezone">{table.timezone || 'None'}</Button>
            </Select>
        </FlexView>
    ),
    Platform: ({ onChange, table }) => (
        <Select
            items={[{
                label: 'None', value: null
            }, {
                label: 'Android', value: 'Android'
            }, {
                label: 'Desktop', value: 'Desktop'
            }, {
                label: 'IOS', value: 'IOS'
            }]}
            itemRenderer={Renderer.menuItemRenderer}
            filterable={false}
            onItemSelect={item => onChange({ target: { name: 'platform', value: item.value } })}
        >
            <Button intent={Intent.PRIMARY} minimal className="platform">{table.platform || 'None'}</Button>
        </Select>
    ),
    Message: ({ onChange, table }) => (
        <FlexView wrap className="filter-label">
            <small>Filter by language/status:</small>
            <Select
                items={[{
                    label: 'None', value: null
                }, {
                    label: 'English', value: language.ENGLISH
                }, {
                    label: 'Chinese', value: language.CHINESE
                }, {
                    label: 'Korea', value: language.KOREA
                }, {
                    label: 'Japan', value: language.JAPAN
                }]}
                itemRenderer={Renderer.menuItemRenderer}
                filterable={false}
                onItemSelect={item => onChange({ target: { name: 'language', value: item.value } })}
            >
                <Button intent={Intent.PRIMARY} minimal className="language">{language_label[table.language] || 'None'}</Button>
            </Select>
            <span>/</span>
            <Select
                items={[{
                    label: 'None', value: null
                }, {
                    label: 'Unapproved', value: false
                }, {
                    label: 'Approved', value: true
                }]}
                itemRenderer={Renderer.menuItemRenderer}
                filterable={false}
                onItemSelect={item => onChange({ target: { name: 'approved', value: item.value } })}
            >
                <Button intent={Intent.PRIMARY} minimal className="approved">
                    {typeof table.approved === 'boolean' ? (
                        table.approved ? 'Approved' : 'Unapproved'
                    ) : 'None'}
                </Button>
            </Select>
        </FlexView>
    )
};

const Cell = {
    Published: ({ original: { published }}) => (
        <FlexView column marginRight="16px">
            <FlexView wrap>
                <strong>Start: </strong>
                <FlexView grow />
                <FlexView column hAlignContent="right">
                    <strong>{published.available_from.toLocaleDateString('en-GB')}</strong>
                    <div>
                        <strong>{Methods.doubleDigit(published.available_from.getHours())}</strong>
                        <span>:</span>
                        <strong>{Methods.doubleDigit(published.available_from.getMinutes())}</strong>
                    </div>
                </FlexView>
            </FlexView>
            <FlexView wrap marginTop="16px">
                <strong>End: </strong>
                <FlexView grow />
                <FlexView column hAlignContent="right">
                    <strong>{published.available_to.toLocaleDateString('en-GB')}</strong>
                    <div>
                        <strong>{Methods.doubleDigit(published.available_to.getHours())}</strong>
                        <span>:</span>
                        <strong>{Methods.doubleDigit(published.available_to.getMinutes())}</strong>
                    </div>
                </FlexView>
            </FlexView>
        </FlexView>
    ),
    Platform: ({ original: { platforms }}) => (
        <FlexView column>
            {[...platforms].map((platform, index) => (
                <span key={index}>{platform}</span>
            ))}
        </FlexView>
    ),
    Message: ({ original, table, handleAfterEdit, handleApprove }) => (
        <Fragment>
            {Object.values(language).map(key => {
                const messages = original[key];
                if (messages) {
                    return (
                        <FlexView key={key} className="language">
                            <FlexView shrink={false} marginRight="24px">
                                <strong>{key}</strong>
                            </FlexView>
                            
                            <FlexView column grow className="message">
                                {messages.map(message => (
                                    <FlexView key={message.id}>
                                        <FlexView column>
                                            <Tooltip content={message.approved ? 'Approved' : 'Unapproved'} position={Position.TOP}>
                                                <StatusIndicator
                                                    status={message.approved}
                                                    title={message.title}
                                                />
                                            </Tooltip>
                                            <p className="message__content">{message.content}</p>
                                        </FlexView>

                                        <FlexView grow />

                                        <FlexView shrink={false} marginLeft="8px">
                                            <div>
                                                <Button intent={Intent.PRIMARY} minimal 
                                                    onClick={() => handleApprove(message.id, !message.approved)}
                                                    text={message.approved ? 'Unapprove' : 'Approve'}/>
                                            </div>
                                            
                                            <div>
                                                <DialogConsumer>
                                                    {({ showDialog, setState, getState }) => (
                                                        <Tooltip content="Edit message">
                                                            <Button intent={Intent.PRIMARY} minimal 
                                                                onClick={() => showDialog(
                                                                    Dialog.EditMessage, { 
                                                                        message: { ...message },
                                                                        handleChange: ({ target: { name, value } }) => {
                                                                            setState({ props: {
                                                                                    ...getState().props,
                                                                                    message: { ...getState().props.message, [name]: value } 
                                                                                } 
                                                                            })
                                                                        }, 
                                                                        onConfirm: message => {
                                                                            const request = { ...message };
                                                                            request.platforms = [...original.platforms];
                                                                            request.availableFrom = Methods.stringifyDate(request.available_from); // TODO should be available_from (fix on BE)
                                                                            request.availableTo = Methods.stringifyDate(request.available_to); // TODO should be available_to (fix on BE)
                                                                            
                                                                            delete request.available_from;
                                                                            delete request.available_to;
                                                                            delete request.approved; // TODO fix on BE.
                                                                    
                                                                            return DataManager.instance
                                                                                .postMessage(request)
                                                                                .then(() => DataManager.instance.getMessages(table))
                                                                                .then(messages => { handleAfterEdit(messages) });
                                                                        }
                                                                    }, { 
                                                                        title: 'Edit message'
                                                                    }
                                                                )} 
                                                                    icon='edit'
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </DialogConsumer>
                                            </div>
                                        </FlexView>
                                    </FlexView>
                                ))}
                            </FlexView>
                        </FlexView>
                    );
                } else {
                    return null;
                }
            })}
        </Fragment>
    )
};

export { Filter, Cell }