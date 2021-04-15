import React from 'react';
import ReactTable from 'react-table';
import FlexView from 'react-flexview';
import {Button, H3} from '@blueprintjs/core';
import {Select} from '@blueprintjs/select';

import {Renderer} from '../../common';
import {statuses} from '../../common/constants';

import './reviews.scss';

function parserDate(param) {
    if (!param) return;

    let date = new Date(param);
    let formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });

    return formatter.format(date);
}


const columns = [
    {
        id: 'reviewer',
        Header: 'Reviewer Id',
        sortable: true,
        filterable: false,
        accessor: 'reviewer.emailAddress'
    },
    {
        id: 'submitter',
        Header: 'Submitter Id',
        sortable: true,
        accessor: 'user.emailAddress',
        filterable: true
    },
    {
        id: 'status',
        sortable: true,
        Header: 'Status',
        accessor: 'status',
        Filter: ({filter, onChange}) => (
            <FlexView className="filter__status" grow>
                <Select
                    items={statuses.reviews}
                    filterable={false}
                    itemRenderer={Renderer.menuItemRenderer}
                    onItemSelect={e => onChange({target: {name: 'status', value: e.value}})}
                >
                    <Button
                        text={columns.table.status === '' ? 'Filter by status' : columns.table.status}
                        rightIcon="caret-down"
                    />
                </Select>
            </FlexView>
        )
    },
    {
        id: 'reviewTime',
        Header: 'Review Completed',
        sortable: true,
        accessor: data => parserDate(data.reviewTimestamp),
        filterable: false
    },
    {
        id: 'submissionDate',
        sortable: true,
        Header: 'Submission Date',
        accessor: data => parserDate(data.submissionTimestamp),
        filterable: false
    }
];


const Reviews = ({handleTableChange, handleEdit, table, reviews, reviewers}) => {
    columns.reviewers = reviewers;
    columns.table = table;


    return (
        <FlexView className="reviews" column>
            <H3>Reviews</H3>

            <p>
                <small>
                    <i>Click on the row to edit the review</i>
                </small>
            </p>

            <ReactTable
                manual
                filterable
                data={reviews.data}
                columns={columns}
                pages={Math.ceil(reviews.recordsFiltered / table.size)}
                defaultPageSize={table.size}
                loading={reviews.fetching}
                onFetchData={handleTableChange}
                getTrProps={(state, rowInfo) => ({
                    onClick: () => {
                        handleEdit(rowInfo.original);
                    },
                    style: {cursor: 'pointer'}
                })}
                className="-striped -highlight"
            />
        </FlexView>
    );
};

export default Reviews;
