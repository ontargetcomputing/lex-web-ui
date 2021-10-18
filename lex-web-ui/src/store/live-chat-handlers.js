/*

RDB - here
 Copyright 2017-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.

 Licensed under the Amazon Software License (the "License"). You may not use this file
 except in compliance with the License. A copy of the License is located at

 http://aws.amazon.com/asl/

 or in the "license" file accompanying this file. This file is distributed on an "AS IS"
 BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
 License for the specific language governing permissions and limitations under the License.
 */

/**
 * Vuex store recorder handlers
 */

/* eslint no-console: ["error", { allow: ["info", "warn", "error", "time", "timeEnd"] }] */
/* eslint no-param-reassign: ["error", { "props": false }] */

// export const createLiveChatSession = (result) => (window.connect.ChatSession.create({
//   chatDetails: result.startChatResult,
//   type: 'CUSTOMER',
// }));
import axios from 'axios';

export const createLiveChatSession = () => {
  const config = {
    method: 'post',
    url: 'http://localhost:3000/startSession',
  };

  return axios(config)
    .then((response) => response.data)
    .then((data) => {
      console.info(`successful session creation: ${JSON.stringify(data)}`);
      return Promise.resolve(data)
    }).catch((error) => {
      console.info(`unsuccessful session creation: ${JSON.stringify(error)}`);
      return Promise.reject(error);
    });
};

// export const connectLiveChatSession = (session) => Promise.resolve(session.connect().then((response) => {
//   console.info(`successful connection: ${JSON.stringify(response)}`);
//   return Promise.resolve(response);
// }, (error) => {
//   console.info(`unsuccessful connection ${JSON.stringify(error)}`);
//   return Promise.reject(error);
// }));

export const connectLiveChatSession = (session) => {
  const config = {
    method: 'post',
    url: 'http://localhost:3000/connect',
    data: JSON.stringify(session),
  };
  return axios(config)
    .then((response) => response.data)
    .then((data) => {
      console.info(`successful connection: ${JSON.stringify(data)}`);
      return Promise.resolve(data);
    }).catch((error) => {
      console.info(`unsuccessful connection ${JSON.stringify(error)}`);
      return Promise.reject(error);
    });
};

// RDB : TODO
// WHAT IS context
// WHAT IS session

export const initLiveChatHandlers = (context, session) => {
  session.onConnectionEstablished((data) => {
    console.info('Established!', data);
    // context.dispatch('pushLiveChatMessage', {
    //   type: 'agent',
    //   text: 'Live Chat Connection Established',
    // });
  });

  session.onMessage((event) => {
    const { chatDetails, data } = event;
    console.info(`Received message: ${JSON.stringify(event)}`);
    console.info('Received message chatDetails:', chatDetails);
    let type = '';
    switch (data.ContentType) {
      case 'application/vnd.amazonaws.connect.event.participant.joined':
        if (data.DisplayName !== context.state.liveChat.username) {
          context.dispatch('liveChatAgentJoined');
          context.commit('setIsLiveChatProcessing', false);
          context.dispatch('pushLiveChatMessage', {
            type: 'agent',
            text: `${data.DisplayName} has joined`,
          });
        }
        break;
      case 'application/vnd.amazonaws.connect.event.participant.left':
      case 'application/vnd.amazonaws.connect.event.chat.ended':
        context.dispatch('liveChatSessionEnded');
        break;
      case 'text/plain':
        switch (data.ParticipantRole) {
          case 'SYSTEM':
            type = 'bot';
            break;
          case 'AGENT':
            type = 'agent';
            break;
          case 'CUSTOMER':
            type = 'human';
            break;
          default:
            break;
        }
        context.commit('setIsLiveChatProcessing', false);
        context.dispatch('pushLiveChatMessage', {
          type,
          text: data.Content,
        });
        break;
      default:
        break;
    }
  });

  session.onTyping((typingEvent) => {
    if (typingEvent.data.ParticipantRole === 'AGENT') {
      console.info('Agent is typing ');
      context.dispatch('agentIsTyping');
    }
  });

  session.onConnectionBroken((data) => {
    console.info('Connection broken', data);
    context.dispatch('liveChatSessionReconnectRequest');
  });

  /*
  NOT WORKING
  session.onEnded((data) => {
    console.info('Connection ended', data);
    context.dispatch('liveChatSessionEnded');
  });
  */
};

export const sendChatMessage = (liveChatSession, message) => {
  // liveChatSession.controller.sendMessage({
  //   message,
  //   contentType: 'text/plain',
  // });
  const config = {
    method: 'post',
    url: 'http://localhost:3000/sendMessage',
    data: {
      message,
      session: liveChatSession,
    },
  };
  return axios(config)
    .then((response) => response.data)
    .then((data) => {
      console.info(`successful sendMessage: ${JSON.stringify(data)}`);
      return Promise.resolve(data);
    }).catch((error) => {
      console.info(`unsuccessful sendMessage ${JSON.stringify(error)}`);
      return Promise.reject(error);
    });


};

export const sendTypingEvent = (liveChatSession) => {
  // RDB is this where agent sees...user is typing
  console.info('liveChatHandler: sendTypingEvent');
  // liveChatSession.controller.sendEvent({
  //   contentType: 'application/vnd.amazonaws.connect.event.typing',
  // });
};

export const requestLiveChatEnd = (liveChatSession) => {
  console.info('liveChatHandler: endLiveChat', liveChatSession);
  liveChatSession.controller.disconnectParticipant();
};
