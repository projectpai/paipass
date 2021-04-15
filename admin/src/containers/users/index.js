import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';

import UsersReducer from './reducer';
import * as actions from './actions';
import Users from './users';

import './users.scss';
import {table} from '../../common/constants';
import {Notification} from "../../common";
import {Route} from "react-router-dom";
import AdminReviewContainer from "../admin-review";

class UsersContainer extends Component {
    state = {

        table: {
            orderBy: table.DEFAULT_ORDER_BY,
            size: table.DEFAULT_PAGE_SIZE,
            page: 1,
            perPage: table.DEFAULT_PAGE_SIZE,
            orderDir: table.DESCENDING,
            email: '',
        },
        users: {recordsFiltered: table.DEFAULT_PAGE_SIZE},
    };

    constructor(props) {
        super(props);
        this.handleTableChange = this.handleTableChange.bind(this);
        this.handleAdminButtonClick = this.handleAdminButtonClick.bind(this);
    }

    componentWillReceiveProps({users}) {
        this.setState({users});
    }

    /**
     * This gets called when table is instaciated so no need for component will mount
     * @param {*} tableState and instance (but is unused here)
     */
    handleTableChange(tableState) {
        this.setState({
            ...this.state,
            table: {
                ...this.state.table,
                size: tableState.pageSize,
                perPage: tableState.pageSize,
                page: tableState.page + 1,
                orderBy: tableState.sorted.length ? tableState.sorted[0].id : table.DEFAULT_ORDER_BY,
                orderDir: tableState.sorted.length ? (tableState.sorted[0].desc ? table.DESCENDING : table.ASCENDING) : table.ASCENDING, // TODO make this more readable
                email: tableState.filtered.length ? tableState.filtered[0].value : '',
            }
        }, () => {
            const {getUsers} = this.props;
            getUsers(this.state.table);
        })
    }
    handleAdminButtonClick(row) {
        /**
        let admnStat = row.adminAccountStatus;
        if (admnStat=='VERIFIED_NOT_PENDING'){
            Notification.showWarning("This dude is an Admin!");
        } else if (admnStat=='NOT_VERIFIED_NOT_PENDING') {
            Notification.showSuccess("This dude is not an Admin");
        } else {
            Notification.showError("This admin account status is not recognized!".concat(admnStat));
        }
         **/
        this.props.history.push(`/home/users/${row.uuid}`)
        this.setState({...this.state, showDrawer:true})
    }


    render() {
        const {table, users} = this.state;

        return (
            <Fragment>
            <Users
                users={users}
                table={table}
                handleTableChange={this.handleTableChange}
                handleAdminButtonClick={this.handleAdminButtonClick}
            />
            <Route path='/home/users/:id' component={AdminReviewContainer}/>
            </Fragment>
    )
    }
}

const mapStateToProps = ({user, users}) => ({user, users});

export default connect(mapStateToProps, actions)(UsersContainer);
export {UsersReducer}
