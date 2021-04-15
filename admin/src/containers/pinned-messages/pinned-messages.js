import React from 'react';
import FlexView from 'react-flexview';
import { Switch, Tab, H3 } from '@blueprintjs/core';

import { Tabs, DialogConsumer } from '../../common';
import Dialog from './dialog';
import NewMessage from './new-message/new-message';
import ViewAllMessages from './view-all-messages/view-all-messages';

const PinnedMessage = ({
    activeRegion,
    selectedTabViewOrCreate,
    dialog,
    notifications,
    
    table,
    message,
    previewUrl,
    messages,
    
    handleApprove,
    handleChange,
    handleTabChange,
    handleTableChange,
    handleToggleMessagesConfirmed,
    handleSubmitNew,
    handlePreview,
    handleAfterEdit,
}) => {
    return (
        <FlexView column marginRight="8px" marginLeft="8px" marginTop="8px">
            <DialogConsumer>
                {({ showDialog, hideDialog, props }) => (
                    <Switch
                        large
                        checked={notifications} 
                        label="Message notification"
                        onChange={e => showDialog(
                            Dialog.Notifications, {
                                notifications,
                                onConfirm: () => {
                                    handleToggleMessagesConfirmed();
                                    hideDialog();
                                }
                            }, { title: notifications ? 'Turn off message?': 'Turn on message?' }
                        )} 
                    />
                )}
            </DialogConsumer>

            <Tabs 
                onChange={(id) => handleTabChange('selectedTabViewOrCreate', id)}
                selectedTabId={selectedTabViewOrCreate}
                renderActiveTabPanelOnly
            >
                <Tab
                    id="message-create" 
                    title={<H3>Create a new pinned message</H3>} 
                    panel={
                        <NewMessage
                            message={message}
                            previewUrl={previewUrl}
                            activeRegion={activeRegion}
                            handleChange={handleChange}
                            handleTabChange={handleTabChange}
                            handleSubmit={handleSubmitNew}
                            handlePreview={handlePreview}
                        />
                    }
                />
                
                <Tab
                    id="messages-view-all" 
                    title={<H3>View all messages</H3>}
                    panel={<ViewAllMessages
                        table={table}
                        handleApprove={handleApprove}
                        handleTableChange={handleTableChange}
                        handleAfterEdit={handleAfterEdit}
                        messages={messages}
                    />}
                />
            </Tabs>
        </FlexView>
    );
};

export default PinnedMessage;
