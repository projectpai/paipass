import React, { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Fab from '@material-ui/core/Fab';
import SendIcon from '@material-ui/icons/Send';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import Typography from '@material-ui/core/Typography';
import InfiniteScroll from 'react-infinite-scroll-component';
import Drawer from '@material-ui/core/Drawer';

import './paiMessages.scss';
import Header from '../../components/shared/Header';
import { useDispatch, useSelector } from 'react-redux';

import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';

import DialogTitle from '@material-ui/core/DialogTitle';
import { getPaiMessages, getPaiMessageThreads, onReceiveChatMessage, onSwitchThreadAction } from './actions';

import { WS_URL_BASE } from '../../util';
import PaiMsgsAppBar from './paiMsgsAppBar';

import '../../common/components/paiMessages/paimsgs';

const PER_PAGE = 15;
const ORDER_BY_4_THREADS = '-created_on';
const ORDER_BY_4_MSGS = '-sent_at';
const ORDER_DIR = 'DESC';


const renderMessages = (self, messages) => {
  const components = [];

  messages.forEach((sent_dt, message) => {
    var isSelf = message.sender === self;
    components.push(<ListItem key={sent_dt} className={'pai-msg-list-item'}>
      <Grid container align={isSelf ? 'right' : 'left'}>
        <Grid item xs={12}>
          <ListItemText
            className={'pai-message pai-message-' + (isSelf ? 'self' : 'them')}>{message.body}</ListItemText>
        </Grid>
      </Grid>
    </ListItem>);
  });
  return components;

};
const renderThreads = (threads, onThreadClick) => {
  const components = [];
  for (const thread of threads) {
    components.push(<ListItem
      button
      key={thread.id}
      onClick={() => onThreadClick(thread.id, thread.name)}
      style={{}}
    >
      <ListItemText primary={thread.name + ' ' + thread.id.slice(-4)}/>
    </ListItem>);
    components.push(<Divider key={'divider-' + thread.id}/>);
  }
  return components;
};

const renderAddRecipientList = (recipients) => {
  const components = [];
  for (const recipient of recipients) {
    components.push(<ListItem key={recipient}>
      <ListItemText primary={recipient}></ListItemText>
    </ListItem>);
  }
  if (components.length > 0) {
    return <List>
      <Typography>Recipients:</Typography>
      {components}
    </List>;
  }
  return components;
};

function CreateThreadDialog(props) {
  const [threadName, setThreadName] = React.useState('');
  const [recipients, setRecipients] = React.useState([]);
  const [newRecipient, setNewRecipient] = React.useState([]);

  const { open, onClose, createThread, isInIframe } = props;

  const onChange = (event) => {
    setThreadName(event.target.value);
  };


  const onAddNewRecipientClick = () => {
    if (newRecipient.length > 0) {
      recipients.push(newRecipient);
      setNewRecipient('');
    }
  };

  const onNewRecipientChange = (event) => {
    setNewRecipient(event.target.value);
  };

  const onCloseCleanup = (result) => {
    // Todo set thread id here if this fn was caused by an onSubmit event
    setThreadName('');
    setNewRecipient('');
    setRecipients([]);
    onClose();
  };

  const handleSubmit = () => {
    const thread = { name: threadName, recipients: recipients, about: null };
    const application = getApplication();
    createThread(thread, application).then(onCloseCleanup);
  };

  return <Dialog open={open} onClose={onCloseCleanup}>
    <DialogTitle id="form-create-thread-dialog">Create New Thread</DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        margin="dense"
        id="name"
        label="Thread Name"
        value={threadName}
        fullWidth
        onChange={onChange}
      />

      <Grid container alignItems={'center'}>
        <Grid item xs={2}>
          <AddCircleIcon onClick={onAddNewRecipientClick}/>
        </Grid>
        <Grid item xs={10}>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Recipient"
            value={newRecipient}
            fullWidth
            onChange={onNewRecipientChange}
          />

        </Grid>

      </Grid>
      {renderAddRecipientList(recipients)}

      <Button onClick={handleSubmit} color="primary">
        Create Thread
      </Button>
      <Button onClick={onCloseCleanup} color="primary">
        Close
      </Button>
    </DialogContent>

  </Dialog>;
}


const PaiMessageList = (props) => {
  const [page, setPage] = React.useState(1);
  const [msg, setMsg] = React.useState('');
  console.log('Pai messages list props', props)
  const dispatch = useDispatch();
  useEffect(() => {
    if (props.threadId.length > 0) {
      getPaiMessages({
        perPage: PER_PAGE,
        orderBy: ORDER_BY_4_MSGS,
        orderDir: ORDER_DIR,
        page: page,
        thread_id: props.threadId,
        dispatch: dispatch,
      });
    }
  }, [dispatch, props.threadId, page]);

  const onMsgChange = (event) => {
    setMsg(event.target.value);
  };

  const onClickSend = () => {
    props.sendMessage({ message: msg });
    setMsg('');
  };

  const messages = useSelector(state => {
      return state.PaiMessages.messages;
    },
  );

  const numMsgs = useSelector(state => {
      return state.PaiMessages.count;
    },
  );

  const hasMoreMsgs = useSelector(state => {
    return state.PaiMessages.next != null;
  });

  const self = useSelector(state => {
    return state.PaiMessages.self;
  });

  const onKeyPress  = (e) => {
      if(e.keyCode == 13){
        onClickSend()
        e.preventDefault()
      }
  }

  const getPrevMessages = () => {
    // this should be enough to trigger the useEffect above
    setPage(page + 1);
  };

  return <div>
    <div
      id="scrollableDiv"
      style={{
        height: '45vh',
        overflowY: 'scroll',
        display: 'flex',
        flexDirection: 'column-reverse',
        //
      }}
    >
      <InfiniteScroll
        dataLength={numMsgs}
        next={getPrevMessages}
        style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          // overflowY: 'scroll',
          flexGrow: 1,

        }}
        inverse={true}
        hasMore={hasMoreMsgs}
        loader={<h4>Loading...</h4>}
        scrollableTarget={'scrollableDiv'}
        className="pai-message-list"
      >

        {renderMessages(self, messages)}
      </InfiniteScroll>
    </div>
    <Divider/>

    <Grid container justify="center" direction="row" className='pai-send-message'>
      <Grid item xs={9}>
        <TextField label="Type Message" fullWidth multiline
                   onKeyDown={onKeyPress}
                   value={msg}
                   onChange={onMsgChange}/>
      </Grid>
      <Grid item xs={2} align="right">
        <Fab color="primary"
             aria-label="add"
             style={{ marginTop: '1%' }}
             onClick={onClickSend}>
          <SendIcon/>
        </Fab>
      </Grid>
    </Grid>
  </div>;

};

const PaiThreadsDrawer = (props) => {
  return (

    <Drawer variant="temporary"
            anchor="left"
            open={props.openDrawer}
            onClose={props.handleDrawerToggle}
            PaperProps={{ style: { position: 'absolute' } }}
            BackdropProps={{ style: { position: 'absolute' } }}
            ModalProps={{
              container: document.getElementById('pai-messages-container'),
              style: { position: 'absolute' },
              keepMounted: true,
            }}
            key={'pai-threads-drawer'}
    >
      <List>

        <ListItem button onClick={props.handleClickOpenDialog} key='add-thread-button'>
          <ListItemIcon>
            <AddCircleIcon/>
          </ListItemIcon>
          <ListItemText primary="Create Thread"/>
        </ListItem>

        <Divider/>

        {renderThreads(props.threads, props.onThreadChange)}

      </List>
    </Drawer>
  );
};


function getApplication() {
  const isInIframe = window.top !== window.self;
  const application = { namespace: null, client_id: null };

  if (isInIframe) {
    application.namespace = window.xprops.application.namespace;
    application.client_id = window.xprops.application.client_id;
  }
  return application;
}

function onReceiveXprops(xprops, createThread) {

  if (!xprops) {
    console.log('xprops is null');
    return;
  }
  const application = getApplication();
  const thread = xprops.thread;
  if (
    application.client_id === null
    || application.namespace === null
    || thread.recipients === null
    || thread.recipients.length < 1
    // about can be null
    // || xprops.about === null
    // || thread.name === null
  ) {
    console.log('XPROPS RECEIVED!');
    console.log(xprops.application);
    console.log(xprops.thread);
    console.log('One of the above were null or empty');
    return;
  }
  createThread(thread, application, true);
}

const getThreadName = (threadNameSuggestion, recipients) => {
  if (threadNameSuggestion.length > 0) {
    return threadNameSuggestion;
  }

  const minRepr = (recipient) => recipient.representation.slice(-5)
  let threadName = '';
  let suffix = '';
  if (recipients.length === 2) {
    return minRepr(recipients[0]) + ' and ' + minRepr(recipients[1]);
  }
  for (const [index, recipient] of recipients.entries()) {
    if (index === (recipients.length - 2)) {
      suffix = ', and ';
    } else if (index === (recipients.length - 1)) {
      suffix = '';
    } else {
      suffix = ', ';
    }
    threadName += minRepr(recipient) + suffix;
  }

  return threadName;
};
const PaiMessages = (props) => {
  const isInIframe = window.top !== window.self;
  const hasXprops = isInIframe && window.hasOwnProperty('xprops')
    && window.xprops.hasOwnProperty('application');
  const hasCreateThreadProps = hasXprops
    && window.xprops.hasOwnProperty('thread')
    && window.xprops.thread.recipients
    && window.xprops.thread.recipients.length > 0;
  const dispatch = useDispatch();
  const { accountService } = props;
  const [page, setPage] = React.useState(1);
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [threadId, setThreadId] = React.useState('');
  const [activeThreadName, setActiveThreadName] = React.useState('');
  const socketUrlDefault = threadId.length > 0 ? `${WS_URL_BASE}/${process.env.REACT_APP_WS_API_PAI_MSGS}${threadId}/` : null;
  console.log('socketUrlDefault',socketUrlDefault)
  const [socketUrl, setSocketUrl] = useState(socketUrlDefault);
  const [openDrawer, setDrawerOpen] = React.useState(false);
  const [hasMainThreadChanged, setHasMainThreadChanged] = React.useState(false);
  // const [ready, setReady] = React.useState(!hasCreateThreadProps);



  const handleDrawerToggle = () => {
    setDrawerOpen(!openDrawer);
  };

  const handleClickOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const onThreadChange = (nextThreadId, threadName, recipients) => {
    if (nextThreadId !== threadId) {
      onSwitchThreadAction({ nextThreadId, dispatch });
      setSocketUrl(`${WS_URL_BASE}/${process.env.REACT_APP_WS_API_PAI_MSGS}${nextThreadId}/`);
      setThreadId(nextThreadId);
      setActiveThreadName(threadName);
    }
    setDrawerOpen(false);

  };

  const handleDeleteThread = () => {
    if (threadId && threadId.length > 0) {
      props.accountService.deleteThread(threadId).then(()=> {
        setHasMainThreadChanged(true)
        setActiveThreadName('')
        setThreadId('')
      })

    }
  }

  const createThread = (thread, application, threadNameCanBeNull = true) => {

    const validThreadName = threadNameCanBeNull || thread.name.length > 0;

    if (validThreadName && thread.recipients.length > 0) {
      return accountService.createThread(thread, application).then((result) => {
          // setReady(true);
          console.log('Receiving result from thread creation ');
          console.log(result);
          if (result.id) {
            const newThreadName = getThreadName(result.name, result.recipients)
            onThreadChange(result.id, newThreadName, result.recipients);
            setHasMainThreadChanged(true)
            return Promise.resolve('Success');
          }

          return Promise.resolve('Failure');
        },
      );
    }
    return Promise.resolve('Invalid Input');
  };
  const threads = useSelector(state => {

      return state.PaiMessageThreads.data;
    },
  );

  const {
    sendJsonMessage,
    lastJsonMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    onMessage: (event) => {
      onReceiveChatMessage({ event, dispatch });
    },
  });

  useEffect(
    () => {
      getPaiMessageThreads({
        perPage: PER_PAGE,
        orderBy: ORDER_BY_4_THREADS,
        orderDir: ORDER_DIR,
        page: page,
        application: getApplication(),
        dispatch: dispatch,
      }).then((threads) => {
        setHasMainThreadChanged(false)
        if (!threads || threads.length < 1) {
          setDrawerOpen(true);
        } else {
          setDrawerOpen(false);
        }
      });
    }, [dispatch, hasMainThreadChanged]);

  useEffect(() => {
    if (!hasCreateThreadProps && (threads.length) > 0 && (threadId.length < 1)) {
      onThreadChange(threads[0].id, threads[0].name, threads[0].recipients);
    }
  }, [threads]);

  useEffect(() => {
    if (hasCreateThreadProps) {
      onReceiveXprops(window.xprops, createThread);
    }
  }, [window.xprops]);

  return (
    <div className="pai-messages-container-rt">
      {isInIframe ? null : <Header withDrawer subtitle="PAI MESSAGES"/>}

      <CreateThreadDialog open={isDialogOpen}
                          onClose={handleCloseDialog}
                          createThread={createThread}
                          isInIframe={isInIframe}
      />

      <Grid container component={Paper} className="pai-messages-container">


        <Grid container direction="column">
          <div id='pai-messages-container' style={{ position: 'relative' }}>
            <PaiThreadsDrawer handleClickOpenDialog={handleClickOpenDialog}
                              threads={threads}
                              onThreadChange={onThreadChange}
                              handleDrawerToggle={handleDrawerToggle}
                              openDrawer={openDrawer}
            />
            <PaiMsgsAppBar
              handleDrawerToggle={handleDrawerToggle}
              threadName={activeThreadName}
              openDrawer={openDrawer}
              handleDeleteThread={handleDeleteThread}

            />
            <Divider/>
            <PaiMessageList threadId={threadId}
                            sendMessage={sendJsonMessage}
                            lastJsonMessage={lastJsonMessage}
                            threadName={activeThreadName}
                            handleDrawerToggle={handleDrawerToggle}
                            openDrawer={openDrawer}


            />
          </div>
        </Grid>

      </Grid>
    </div>
  );
};


export default PaiMessages;