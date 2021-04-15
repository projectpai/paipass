import React, { Component } from 'react';
import { Link, NavLink } from 'react-router-dom';
import MediaQuery from 'react-responsive';

import {
    Alignment,
    Button,
    Icon,
    Menu,
    MenuItem,
    Navbar,
    Popover,
} from "@blueprintjs/core";

import { DialogConsumer } from '../../common';
import './header.scss';
import ResetPasswordDialog from './reset-password-dialog';

class Header extends Component {
    
    state = { isHamburgerActive: false };

    constructor(props) {
        super(props);

        this.handleHamburger = this.handleHamburger.bind(this);
    }

    handleHamburger() {
        setTimeout(() => {
            this.setState({ isHamburgerActive: !this.state.isHamburgerActive });
        }, 0);
    }

    render() {
        const {
            handleUserMenu,
            email,
        } = this.props;

        const { isHamburgerActive } = this.state;

        return (
            <header>
                <MediaQuery minWidth={768}>
                    <Navbar className="header">
                        <Navbar.Group align={Alignment.LEFT} className="header-group">
                            <Navbar.Heading>
                                <Link to="/home">PAI Pass Admin</Link>
                            </Navbar.Heading>
                            <Navbar.Divider />


                            <NavLink activeClassName="selected" to="/home/reviews">
                                <Icon icon="annotation"/>Reviews
                            </NavLink>
    
                            <NavLink activeClassName="selected" to="/home/users">
                                <Icon icon="person"/>Users
                            </NavLink>

     
    
                            <Navbar.Divider className="header-divider" />
    
                            <Popover content={
                                <Menu>
                                    <MenuItem
                                        text="Logout"
                                        icon="log-out"
                                        onClick={e => handleUserMenu('logout')}
                                        shouldDismissPopover
                                    />

                                </Menu>
                            }>
                                <Button
                                    minimal
                                    rightIcon='caret-down'
                                    text={email}
                                />
                            </Popover>
                        </Navbar.Group>
                    </Navbar>
                </MediaQuery>
    
                <MediaQuery maxWidth={767}>
    
                    <div className="header-fake"/>
    
                    <Navbar className={`header header--mobile ${isHamburgerActive ? 'active': ''}`}>
                        <Navbar.Group className="header-group">
                            <NavLink activeClassName="selected" to="/home/reviews" onClick={this.handleHamburger}>
                                <Icon icon="annotation"/>Reviews
                            </NavLink>
                        </Navbar.Group>
    
                        <Navbar.Group className="header-group">
                            <NavLink activeClassName="selected" to="/home/users" onClick={this.handleHamburger}>
                                <Icon icon="person"/>Users
                            </NavLink>
                        </Navbar.Group>
    
                        <Navbar.Group className="header-group">
                            <NavLink activeClassName="selected" to="/home/pinned-messages" onClick={this.handleHamburger}>
                                <Icon icon="pin"/>Messages
                            </NavLink>
                        </Navbar.Group>
    
                        <Navbar.Group className="header-group">
                            <NavLink activeClassName="selected" to="/home/articles" onClick={this.handleHamburger}>
                                <Icon icon="document"/>Articles
                            </NavLink>
                        </Navbar.Group>
    
                        <Navbar.Group align={Alignment.LEFT} className="header-group" onClick={this.handleHamburger}>
                            <Button icon="menu" minimal/>
                            <div className="header-divider" />
                            <Navbar.Heading>
                                <Link to="/home">PAI Admin</Link>
                            </Navbar.Heading>
                        </Navbar.Group>
                    </Navbar>
                </MediaQuery>
            </header>
        )
    }
}

export default Header;
