import React from 'react';
import FlexView from 'react-flexview';
import { Checkbox, H4, Intent, Tab } from '@blueprintjs/core';

import { Tabs, FormConfirm, MobilePreview } from '../../../common';
import { language, language_label } from '../../../common/constants';

import Region from '../region';
import './new-message.scss';

const NewMessage = ({
    activeRegion,
    handleSubmit,
    handleChange,
    handleTabChange,
    handlePreview,
    previewUrl,
    message={}
}) => {
    return (
        <FormConfirm 
            onSubmit={handleSubmit}
            submit={{
                intent: Intent.PRIMARY,
                className: 'submit-new'
            }}
        >
            <FlexView>
                <FlexView marginLeft="16px">
                    <Checkbox
                        label="Desktop"
                        name="platforms"
                        checked={message.platforms.includes('desktop')}
                        onChange={handleChange}
                        value="desktop"
                    />
                </FlexView>

                <FlexView marginLeft="16px">
                    <Checkbox
                        label="Android"
                        name="platforms"
                        checked={message.platforms.includes('android')}
                        onChange={handleChange}
                        value="android"
                    />
                </FlexView>

                <FlexView marginLeft="16px">
                    <Checkbox
                        label="IOS"
                        name="platforms"
                        checked={message.platforms.includes('IOS')}
                        onChange={handleChange}
                        value="IOS"
                    />
                </FlexView>
            </FlexView>

            <FlexView marginTop="32px" marginBottom="32px" className="new-message">
                <FlexView column grow className="new-message__region">
                    <H4>Write messages</H4>
                    <Tabs onChange={(id) => handleTabChange('activeRegion', id)} selectedTabId={activeRegion}>
                        {Object.values(language).map(value => (
                            <Tab 
                                id={value}
                                key={value}
                                title={language_label[value]}
                                panel={
                                    <Region 
                                        handlePreview={handlePreview}
                                        handleChange={handleChange}
                                        message={message[value]}
                                    />
                                }
                            />
                        ))}
                    </Tabs>
                </FlexView>

                {previewUrl && <div className="new-message__preview">
                    <MobilePreview url={previewUrl}/>
                </div>}
            </FlexView>
        </FormConfirm>
    );
};

export default NewMessage;
