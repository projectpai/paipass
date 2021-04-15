import React, {Component} from 'react';
import {Icon} from "@blueprintjs/core";
import './user-attribute-status.scss';

class UserAttributeStatus extends Component {
    constructor(props) {

        console.log(props);
        super(props)
        this.state = {status: props.status};
    }

    render() {

        return (
            <div className={`status  ${this.props.status}`}>
                <Icon {...this.props}></Icon>
            </div>
        )
    }
}

export default UserAttributeStatus;
