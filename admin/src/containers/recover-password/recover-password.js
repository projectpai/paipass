import React from 'react';
import { Link } from 'react-router-dom';
import FlexView from 'react-flexview';
import { InputGroup, Button, Card, H2, Elevation } from "@blueprintjs/core";

const RecoverPassword = (props) => {

    const { handleSubmit, processing } = props;

    return (
        <FlexView hAlignContent='center' height="100vh">
            <FlexView vAlignContent='center'>
                <Card interactive elevation={Elevation.TWO}>
                    <FlexView column>
                        <H2>Recover Password</H2>
                        <form onSubmit={handleSubmit}>
                            <FlexView column marginTop="16px">
                                <InputGroup
                                    id="email"
                                    type="email"
                                    name="email"
                                    leftIcon="envelope"
                                    placeholder="Enter email"
                                />

                                <FlexView marginTop="16px"
                                    marginBottom="8px"
                                    hAlignContent="center"
                                    vAlignContent="center"
                                >
                                    <Link to="/login">Cancel</Link>
                                    <FlexView grow/>
                                    <Button type="submit" 
                                        intent="primary" 
                                        text="Send Email" 
                                        loading={processing}/>
                                </FlexView>
                            </FlexView>
                        </form>
                    </FlexView>
                </Card>
            </FlexView>
        </FlexView>
    );
};

export default RecoverPassword;