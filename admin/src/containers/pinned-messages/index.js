import React, { Component } from 'react';

import PinnedMessage from './pinned-messages';
import { language, timezone } from '../../common/constants';
import { Methods, DataManager, Notification } from '../../common';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SELECTED_VIEW_OR_CREATE='message-create';
const INITIAL_MESSAGE_STATE = {
    platforms: ['android', 'IOS'],
    [language.ENGLISH]: {
        language: language.ENGLISH,
        title: '',
        content: '',
        available_from: new Date(),
        available_to: new Date(new Date().setDate(new Date().getDate() + 7)),
        timezone: timezone.PACIFIC,
    },
    [language.CHINESE]: {
        language: language.CHINESE,
        title: '',
        content: '',
        available_from: new Date(),
        available_to: new Date(new Date().setDate(new Date().getDate() + 7)),
        timezone: timezone.CHINESE,
    },
    [language.JAPAN]: {
        language: language.JAPAN,
        title: '',
        content: '',
        available_from: new Date(),
        available_to: new Date(new Date().setDate(new Date().getDate() + 7)),
        timezone: timezone.JAPAN,
    },
    [language.KOREA]: {
        language: language.KOREA,
        title: '',
        content: '',
        available_from: new Date(),
        available_to: new Date(new Date().setDate(new Date().getDate() + 7)),
        timezone: timezone.KOREA,
    },
};

class PinnedMessagesContainer extends Component {        
    state = {
        messages: {
            data: [],
            messagesFiltered: DEFAULT_PAGE_SIZE,
            fetching: true
        },
        table: {
            page: 1,
            size: DEFAULT_PAGE_SIZE,
            approved: null,
            language: null,
            platform: null,
            timezone: null,
            datetime: null,
        },
        previewUrl: null,
        message: { ...INITIAL_MESSAGE_STATE },
        notifications: false,
        activeRegion: language.ENGLISH,
        selectedTabViewOrCreate: DEFAULT_SELECTED_VIEW_OR_CREATE,
    }

    constructor(props) {
        super(props);
        
        this.handleApprove = this.handleApprove.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleTabChange = this.handleTabChange.bind(this);
        this.handleToggleMessagesConfirmed = this.handleToggleMessagesConfirmed.bind(this);
        this.handleTableChange = this.handleTableChange.bind(this);
        this.handleSubmitNew = this.handleSubmitNew.bind(this);
        this.handlePreview = this.handlePreview.bind(this);
        this.handleAfterEdit =  this.handleAfterEdit.bind(this);
    }

    handleTabChange(name, id) {
        this.setState({ ...this.state, [name]: id })
    }

    handleToggleMessagesConfirmed(event) {
        event.details = { notifications: !this.state.notifications };
    }

    /**
     * Update the table state from the table.
     * @param {*} tableState State object of the table
     */
    handleTableChange(tableState) {
        
        const table = {};
        tableState.filtered.forEach(({ value: { target } }) => {
            table[target.name] = target.value;
        });

        this.setState({
            ...this.state,
            table: {
                ...this.state.table,
                size: tableState.pageSize,
                page: tableState.page,  // TODO inconsistant page indexing
                ...table
            }
        }, () => {
            DataManager.instance
                .getMessages(this.state.table)
                .then(messages => {
                    this.setState({ messages });
                })
                .catch(error => {
                    if (typeof error === 'string') {
                        Notification.showWarning(error);
                    } else {
                        Notification.showWarning(error.response.data.status.message);
                    } 
                    this.setState({ messages: { ...this.state.messages, fetching: false } });
                });;
        });
    }

    handleSubmitNew() {
        const requests = [];
        const message = this.state.message;

        Object.values(language).forEach(lang => {
            if (message[lang].content.length) {debugger
                const request = { ...message[lang] };
                request.platforms = this.state.message.platforms;
                request.availableFrom = Methods.stringifyDate(request.available_from); // TODO should be available_from (fix on BE)
                request.availableTo = Methods.stringifyDate(request.available_to); // TODO should be available_to (fix on BE)
                
                delete request.available_from;
                delete request.available_to;
                
                requests.push(DataManager.instance.postMessage(request));
            }
        });

        Promise.all(requests)
            .then(() => DataManager.instance
                .getMessages(this.state.table)
                )
                .then((messages) => {
                    this.setState({
                    messages, 
                    message: INITIAL_MESSAGE_STATE, 
                    selectedTabViewOrCreate: 'messages-view-all'
                });
            });
    }

    handleApprove(id, approve) {
        this.setState({ ...this.state, messages: { ...this.state.messages, fetching: true }})
        DataManager.instance
            .post(`/paicoin/updateannouncementstatus/${id}/${approve ? 'approve' : 'reject'}`)
            .then(() => DataManager.instance
                .getMessages(this.state.table)
                )
                .then((messages) => this.setState({ messages }));
        }

    /**
     * TODO missing API endpoint...
     */
    handlePreview() {
        if (this.state.previewUrl === null) {
            this.setState({ previewUrl: 'http://www.google.com' });
        } else {
            this.setState({ previewUrl: null });
        }
    }

    handleChange(e) {
        const {target: { name, value }} = e;
        const newState = { 
            ...this.state,
            message: { 
                ...this.state.message,
                [this.state.activeRegion]: { 
                    ...this.state.message[this.state.activeRegion],
                    [name]: value, 
                } 
            },
        };

        switch (name) {
            case 'platforms': // platform specific
                const index = this.state.message.platforms.indexOf(value);
                if (index >= 0) {
                    if (this.state.message.platforms.length === 1) { 
                        return;
                    } else {
                        newState.message.platforms = [...this.state.message.platforms];
                        newState.message.platforms.splice(index, 1);
                    }
                } else {
                    newState.message.platforms = [...this.state.message.platforms, value];
                }
                break;
            default: // all region specific events
                newState.message[this.state.activeRegion] = {
                    ...this.state.message[this.state.activeRegion], [name]: value
                };
                break;
        }

        this.setState(newState, () => { console.log(this.state.message) });
    }

    handleAfterEdit(messages) {
        this.setState({ messages });
    }

    render() {
        return (
            <PinnedMessage { ...this.state }
                handleApprove={this.handleApprove}
                handleChange={this.handleChange}
                handleTabChange={this.handleTabChange}
                handleToggleMessagesConfirmed={this.handleToggleMessagesConfirmed}
                handleTableChange={this.handleTableChange}
                handleSubmitNew={this.handleSubmitNew}
                handlePreview={this.handlePreview}
                handleAfterEdit={this.handleAfterEdit}
            />
        )
    }
}

export default PinnedMessagesContainer;
