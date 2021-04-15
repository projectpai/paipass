import React, { Fragment } from 'react';
import FlexView from 'react-flexview';
import { Button, H3, Intent, MenuItem, Tooltip } from '@blueprintjs/core';
import ReactTable from 'react-table';
import { Select } from '@blueprintjs/select';

import { StatusIndicator } from '../../common';
import { DialogConsumer } from '../../common/contexts/dialog-context';
import Dialog from './dialog';
import { language, language_label } from '../../common/constants';

const parserDate = (param) => {
    let date = new Date(param);
    let formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });

    return formatter.format(date);
};

const articleStatuses = [
    { label: 'Publish', value: true },
    { label: 'Unpublish', value: false },
];

const languages = [
    // { label: 'Show All', value: 'all' },
    { label: language_label.EN, value: language.ENGLISH },
    { label: language_label.ZH, value: language.CHINESE },
    { label: language_label.JA, value: language.JAPAN },
    { label: language_label.KO, value: language.KOREA },
];

const columns = (props) => [
    {
        Header: 'Article title',
        accessor: 'title'
    },
    {
        Header: 'Language',
        accessor: 'language',
        width: 100,
        Cell: row => {
            return (
                <FlexView hAlignContent="center">
                    {row.value}
                </FlexView>
            )
        }
    },
    {
        Header: 'Actual web link',
        accessor: 'url',
        sortable: false,
        Cell: row => {
            return (
                <a href={row.value} target="_blank" rel="noopener noreferrer">{row.value}</a>
            )
        }
    },
    {
        Header: 'Publish Date',
        id: 'lastUpdated',
        width: 200,
        sortable: false,
        accessor: row => parserDate(row.lastUpdated)
    },
    {
        Header: 'Status',
        accessor: 'approved',
        width: 140,
        Cell: row => {
            return (
                <FlexView hAlignContent="center">
                    <StatusIndicator
                        status={row.value}
                        title={(row.value ? articleStatuses[0].label : articleStatuses[1].label) + 'ed'}
                    />
                </FlexView>
            );
        }
    },
    {
        Header: 'Action',
        sortable: false,
        width: 140,
        Cell: (row) => {
            return (
                <FlexView hAlignContent="center">
                    <DialogConsumer>
                        {({ showDialog }) => (
                            <Button
                                intent={Intent.PRIMARY}
                                minimal
                                text={row.original.published ? articleStatuses[0].label : articleStatuses[1].label}
                                onClick={() => {
                                    const publish = row.original.published;
                                    showDialog(
                                        Dialog.ConfirmPublishDialog,
                                        {
                                            publish,
                                            isOpen: true,
                                            article: row.original,
                                            onConfirm: props.handlePublishStatusChange
                                        },
                                        { title: publish ? 'Publish Article' : 'Unpublish Article' }
                                    )
                                }}
                            />
                        )}
                    </DialogConsumer>

                    <DialogConsumer>
                        {({ showDialog }) => (
                            <Tooltip content="Article Preview">
                                <Button
                                    intent={Intent.PRIMARY}
                                    icon='eye-open'
                                    minimal
                                    onClick={() =>
                                        showDialog(
                                            Dialog.MobilePreviewDialog,
                                            {
                                                isOpen: true,
                                                url: row.original.url
                                            },
                                            { title: 'Article Preview' }
                                        )
                                    }
                                />
                            </Tooltip>
                        )}
                    </DialogConsumer>
                </FlexView>
            )
        }
    },
];

const itemRenderer = (item, { handleClick }) => {
    return (
        <MenuItem
            key={item.value}
            text={item.label}
            onClick={handleClick}
            shouldDismissPopover
        />
    )
};

const Article = (props) => {

    const {
        articles,
        table,
        handleTableChange,
        handleChangeSelect,
    } = props;

    return (
        <Fragment>
            <FlexView column marginTop="16px" marginLeft="8px" marginRight="8px">
                <H3>Articles</H3>
                <FlexView marginBottom="16px">
                    <Select
                        items={languages}
                        itemRenderer={itemRenderer}
                        filterable={false}
                        onItemSelect={e => handleChangeSelect('language', e.value)}>
                        <Button
                            style={{ minWidth: '160px' }}
                            text={table.language ? language_label[table.language] : 'Select a language'}
                            rightIcon='caret-down' />
                    </Select>
                </FlexView>

                <ReactTable
                    manual
                    columns={columns(props)}
                    data={articles.data}
                    pages={articles.pages}
                    defaultPageSize={table.pageSize}
                    loading={articles.fetching}
                    onFetchData={handleTableChange}
                    className="-striped"
                />
            </FlexView>
        </Fragment>
    );
};

export default Article;