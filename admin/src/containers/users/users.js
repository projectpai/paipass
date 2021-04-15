import React from 'react';
import ReactTable from 'react-table';
import FlexView from 'react-flexview';
import {H3, InputGroup} from "@blueprintjs/core";
import UserAttributeStatus from '../../common/components/user-attribute-status'
import { DataManager, Notification } from '../../common';



const columns = [{
    Header: 'Email',
    accessor: 'email',
    Filter: ({filter, onChange}) => {
        return (
            <InputGroup
                type="email"
                onChange={(e) => onChange(e.target.value)}
                placeholder="Filter by email"
            />
        )
    },
    Cell: ({original}) => (
        original.emailAddress
    )
}, {
    Header: 'Last Login',
    accessor: 'lastLogin',
    filterable: false,

}, {
    Header: 'Email Status',
    accessor: 'emailVerificationStatus',
    filterable: false,
    sortable:false,
    Cell: row => <UserAttributeStatus icon='envelope' status={row.value}/>
}, {
    Header: 'Phone Status',
    accessor: 'phoneVerificationStatus',
    filterable: false,
    sortable:false,
    Cell: row => <UserAttributeStatus icon='phone' status={row.value}/>
}, {
    Header: 'Identity Status',
    accessor: 'nameGovidVerificationStatus',
    filterable: false,
    sortable:false,
    Cell: row => <UserAttributeStatus icon='id-number' status={row.value}/>
}, {
    Header: 'Admin. Status',
    accessor: 'adminAccountStatus',
    filterable: false,
    sortable: false,
    Cell: row =>  <UserAttributeStatus icon='crown' status={row.value}/>
}];

const Users = (props) => {
    const {
        table,
        users,
        handleTableChange,
        handleAdminButtonClick,
        processing
    } = props;


    return (
        <FlexView className="users" column>
            <FlexView wrap vAlignContent="bottom">
                <H3>Users</H3>

                <FlexView grow/>


            </FlexView>

            <ReactTable
                filterable
                manual
                data={users.data}
                columns={columns}
                pages={Math.ceil(users.recordsFiltered / table.size)}
                defaultPageSize={table.size}
                loading={users.fetching}
                onFetchData={handleTableChange}
                className="-striped -highlight -has-filters"
                getTdProps={(state, rowInfo, column, instance) => ({
                    onClick: () => {
                        handleAdminButtonClick(rowInfo.original)
                    }
                })}
            />
        </FlexView>
    );
};

export default Users;