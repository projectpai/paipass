import React from 'react';
import FlexView from 'react-flexview';
import {Button, Card, Elevation, H2, InputGroup} from "@blueprintjs/core";
import Cookies from 'js-cookie';

import {Config} from '../../common/constants/config';

const Login = ({handleSubmit, handleChange, processing}) => {

    return (
        <FlexView hAlignContent='center' height="100vh">
            <FlexView vAlignContent='center'>
                <Card interactive={true} elevation={Elevation.TWO}>
                    <FlexView column width="300px">
                        <H2>Login</H2>
                        <form action={`${Config.url}/api/v1/rest-auth/login/`} method="post">
                            <input type="hidden" name="csrfmiddlewaretoken" value={Cookies.get('csrftoken')} />

                            <FlexView column marginTop="16px">
                                <input hidden name="app" value="webapp-video-review"/>
                                <InputGroup
                                    type="email"
                                    name="email"
                                    leftIcon="envelope"
                                    onChange={handleChange}
                                    placeholder="Enter email"
                                />

                                <FlexView column marginTop="8px">
                                    <InputGroup
                                        type="password"
                                        name="password"
                                        leftIcon="lock"
                                        onChange={handleChange}
                                        placeholder="Enter Password"
                                    />
                                </FlexView>

                                <FlexView marginTop="16px"
                                          marginBottom="8px"
                                          hAlignContent="center">
                                    <Button type="submit"
                                            intent="primary"
                                            loading={processing}
                                            text="Login"/>
                                </FlexView>

                            </FlexView>
                        </form>
                    </FlexView>
                </Card>
            </FlexView>
        </FlexView>
    );
};

export default Login;
