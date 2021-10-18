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
/* eslint-disable */
import axios from 'axios';
import { liveChatStatus } from '@/store/state';

// RDB TODO
export const createLiveChatSession = (context) => {
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/startSession`,
  };

  return axios(config)
    .then((response) => response.data)
    .then((data) => {
      console.info(`successful session creation: ${JSON.stringify(data)}`);
      return Promise.resolve(data);
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

export const connectLiveChatSession = (session, context) => {
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/connect`,
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

export const initLiveChatHandlers = async (context, session) => {
  console.info(`initLiveChatHandlers status=${context.state.liveChat.status}`);
  const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  while ([liveChatStatus.ESTABLISHED, liveChatStatus.CONNECTING].includes(context.state.liveChat.status)) {
    console.info('live-chat-handlers: polling live agent');

    const chatRequestSuccess = (data) => {
      console.info('------------chatRequestSuccess')
      console.info('chatRequestSuccess!', data);
      context.dispatch('pushLiveChatMessage', {
        type: 'agent',
        text: 'Live Chat Connection Established',
      });      
    }

    const chatEstablished = (data) => {
      console.info('Established!', data);
      context.dispatch('pushLiveChatMessage', {
        type: 'agent',
        text: `${data.message.name} has joined`,
      });      
    }

    const chatMessage = (data) => {
      console.info(`Received message: ${JSON.stringify(data.message.text)}`);
      context.commit('setIsLiveChatProcessing', false);
      context.dispatch('pushLiveChatMessage', {
        type: 'agent',
        text: data.message.text,
      });
    }

    const customEvent = (element) => {
      console.info('------------CustomEvent')
    }

    const queueUpdate = (element) => {
      console.info('------------queueUpdate')
    }

    const agentTyping = (element) => {
      console.info('Agent is typing ');
      context.dispatch('agentIsTyping');
    }

        const agentNotTyping = (element) => {
      //if (typingEvent.data.ParticipantRole === 'AGENT') {
      console.info('Agent is not typing ');
      context.dispatch('agentIsNotTyping');
      //}
    }

    const config = {
      method: 'post',
      url: `${context.state.config.live_agent.endpoint}/getMessage`,
      data: {
        session,
      },
    };
    await axios(config)
      .then((response) => {
        console.info('live-chat-handlers - get messages')
        console.info(response);
        response.data.messages.forEach(element => {
          const type = element.type;
          console.info(`Received type:${type}`)
          switch (type) {
            case 'ChatRequestSuccess':
              chatRequestSuccess(element);
              break;
            case 'ChatEstablished':
              chatEstablished(element);
              break;
            case 'ChatMessage':

              console.info('--------------------------------')
              console.info(JSON.stringify(context.state.messages))
              console.info('--------------------------------')
              chatMessage(element);


              break;
            case 'CustomEvent':
              customEvent(element);
              break;               
            case 'QueueUpdate':
              queueUpdate(element);
              break;               
            case 'AgentTyping':
              agentTyping(element);
              break;
            case 'AgentNotTyping':
              agentNotTyping(element);
              break;
            default:
              console.error(`Unknown message type:${type}`)
          }
        })
        // .then((data) => {
        //   console.info(`successful connection: ${JSON.stringify(data)}`);
        //   return Promise.resolve(data);
        return Promise.resolve();
      }).then(() => {
        console.info('***************sleep');
        return sleep(5000);
      }).catch((error) => {
        console.info(`unsuccessful connection ${JSON.stringify(error)}`);
        return Promise.reject(error);
      });
    //await sleep(2000);
  }


  // session.onConnectionEstablished((data) => {
  //   console.info('Established!', data);
  //   context.dispatch('pushLiveChatMessage', {
  //     type: 'agent',
  //     text: 'Live Chat Connection Established',
  //   });
  // });

  // session.onMessage((event) => {
  //   const { chatDetails, data } = event;
  //   console.info(`Received message: ${JSON.stringify(event)}`);
  //   console.info('Received message chatDetails:', chatDetails);
  //   let type = '';
  //   switch (data.ContentType) {
  //     case 'application/vnd.amazonaws.connect.event.participant.joined':
  //       // TODO
  //       if (data.DisplayName !== context.state.liveChat.username) {
  //         context.dispatch('liveChatAgentJoined');
  //         context.commit('setIsLiveChatProcessing', false);
  //         context.dispatch('pushLiveChatMessage', {
  //           type: 'agent',
  //           text: `${data.DisplayName} has joined`,
  //         });
  //       }
  //       break;
  //     case 'application/vnd.amazonaws.connect.event.participant.left':
  //     case 'application/vnd.amazonaws.connect.event.chat.ended':
  //       context.dispatch('liveChatSessionEnded');
  //       break;
  //     case 'text/plain':
  //       switch (data.ParticipantRole) {
  //         case 'SYSTEM':
  //           type = 'bot';
  //           break;
  //         case 'AGENT':
  //           type = 'agent';
  //           break;
  //         case 'CUSTOMER':
  //           type = 'human';
  //           break;
  //         default:
  //           break;
  //       }
  //       context.commit('setIsLiveChatProcessing', false);
  //       context.dispatch('pushLiveChatMessage', {
  //         type,
  //         text: data.Content,
  //       });
  //       break;
  //     default:
  //       break;
  //   }
  // });

  // session.onTyping((typingEvent) => {
  //   if (typingEvent.data.ParticipantRole === 'AGENT') {
  //     console.info('Agent is typing ');
  //     context.dispatch('agentIsTyping');
  //   }
  // });

  // session.onConnectionBroken((data) => {
  //   console.info('Connection broken', data);
  //   context.dispatch('liveChatSessionReconnectRequest');
  // });

  /*
  NOT WORKING
  session.onEnded((data) => {
    console.info('Connection ended', data);
    context.dispatch('liveChatSessionEnded');
  });
  */
};

export const sendChatMessage = (context, liveChatSession, message) => {
  // liveChatSession.controller.sendMessage({
  //   message,
  //   contentType: 'text/plain',
  // });
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/sendMessage`,
    data: {
      message,
      session: liveChatSession,
    },
  };
  return axios(config)
    .then((response) => response.data)
    .then((data) => {
      console.info(`successful sendMessage: ${JSON.stringify(data)}`);
      context.dispatch('pushLiveChatMessage', {
        type: 'human',
        text: message,
      });
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
