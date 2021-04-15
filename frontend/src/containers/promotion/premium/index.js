import React from "react";
import Button from "@material-ui/core/Button";
import { withTheme } from "@material-ui/core/styles";

import Premium from "./premium";
import { withSnackbar } from "notistack";

class PremiumContainer extends React.Component {
  handleUpgrade = () => {
    const { history, accountService, enqueueSnackbar } = this.props;

    accountService
      .upgradeProfile()
      .then(() => {
        enqueueSnackbar("Successfully upgraded profile", {
          variant: "success",
          action: (
            <Button color="primary" size="small">
              Dismiss
            </Button>
          )
        });
        history.push("/dashboard");
      })
      .catch(() => {
        enqueueSnackbar("Failed fetching data.");
      });
  };

  render() {
    return <Premium handleUpgrade={this.handleUpgrade} />;
  }
}

export default withSnackbar(withTheme(PremiumContainer));
