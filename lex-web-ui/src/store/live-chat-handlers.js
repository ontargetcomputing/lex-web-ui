/*

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

export const connectLiveChatSession = (session, context) => {
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/connect`,
    data: JSON.stringify({
      session,
      chat_history: context.state.messages,
      livechat_username: context.getters.liveChatUserName(),
    })
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

export const initLiveChatHandlers = async (context, session) => {
  console.info(`initLiveChatHandlers status=${context.state.liveChat.status}`);
  const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  while ([liveChatStatus.ESTABLISHED, liveChatStatus.CONNECTING].includes(context.state.liveChat.status)) {
    console.info('live-chat-handlers: polling live agent');

    const chatRequestSuccess = (data) => {
      console.info('chatRequestSuccess!', data);
      context.dispatch('pushLiveChatMessage', {
        type: 'agent',
        text: 'Live Chat Connection Established',
      });      
    }

    const chatEstablished = (data) => {
      console.info('Established!', data);
      context.dispatch('liveChatAgentJoined');
      context.commit('setIsLiveChatProcessing', false);      
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
      console.info('CustomEvent')
    }

    const queueUpdate = (element) => {
      console.info('queueUpdate')
    }

    const agentTyping = (element) => {
      console.info('Agent is typing ');
      context.dispatch('agentIsTyping');
    }

    const agentNotTyping = (element) => {
      console.info('Agent is not typing ');
      context.dispatch('agentIsNotTyping');
    }

    const agentEndedChat = (element) => {
      console.info('Agent ended chat');
      context.dispatch('pushLiveChatMessage', {
        type: 'agent',
        text: 'Agent has ended the session',
      });      
      context.dispatch('liveChatSessionEnded');
    }
    
    const config = {
      method: 'post',
      url: `${context.state.config.live_agent.endpoint}/getMessage`,
      data: {
        session,
        targetLanguage: 'en'
      }
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
              console.info(JSON.stringify(context.state.messages))
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
            case 'ChatEnded':
              agentEndedChat(element);
              break;
            default:
              console.error(`Unknown message type:${type}`)
          }
        })
        return Promise.resolve();
      }).catch((error) => {
        if (error.code === 'ECONNABORTED') {
          console.info('No messages after poll interval');  
        } else {
          console.info(`unsuccessful connection ${JSON.stringify(error)}`);
        }
      }).finally(() => {
        console.info('Sleeping');
        return sleep(context.state.config.live_agent.salesforcePollingInterval);
      });
  }
};

export const sendChatMessage = (context, liveChatSession, message) => {
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/sendMessage`,
    data: {
      message,
      session: liveChatSession,
        sourceLanguage: 'en',
        targetLanguage: 'en'      
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
  // TODO : send something to salesforce
  console.info('liveChatHandler: sendTypingEvent');
};

export const requestLiveChatEnd = async (context, liveChatSession) => {
  console.info('liveChatHandler: endLiveChat', liveChatSession);
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/endChat`,
    data: {
      session: liveChatSession,
    }
  };
  await axios(config)
    .then((response) => {
      console.info(response);
      context.dispatch('pushLiveChatMessage', {
        type: 'bot',
        text: 'TODO: Livechat session ended, returning you to Miles',
      });
      return Promise.resolve();
    }).catch((error) => {
      console.info(`unsuccessful end chat ${JSON.stringify(error)}`);
    })

  context.dispatch('liveChatSessionEnded');
};
