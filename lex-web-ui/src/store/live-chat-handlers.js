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
import { liveChatStatus } from '@/store/state';
import { axiosWithRetry } from '@/store/axios-wrapper';

export const createLiveChatSession = (context) => {
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/startSession`,
  };

  return axiosWithRetry(config)
    .then((response) => response.data)
    .then((data) => {
      console.info(`successful session creation: ${JSON.stringify(data)}`);
      return Promise.resolve(data);
    }).catch((error) => {
      console.info(`unsuccessful session creation: ${JSON.stringify(error)}`);
      return Promise.reject(error);
    });
};

// export const cookChatHistory = (chat_history) => {
//   chat_history.forEach(element => console.log(`fodofkdfjdkfjdkfjdk ${JSON.stringify(element)}`));
// }

export const connectLiveChatSession = (session, context, caseId, contactId) => {
  
  // cookChatHistory(context.state.messages)
  const config = {
    method: 'post',
    url: `${context.state.config.live_agent.endpoint}/connect`,
    data: JSON.stringify({
      session,
      chat_history: context.state.messages,
      livechat_username: context.getters.liveChatUserName(),
      caseId: caseId,
      contactId: contactId
    })
  };
  return axiosWithRetry(config)
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

  const establishedMsg = await context.dispatch('translate', { targetLanguage: context.state.lex.targetLanguage, message: 'Live Chat Connection Established' })
  const joinedMsg = await context.dispatch('translate', { targetLanguage: context.state.lex.targetLanguage, message: 'has joined' })
  while ([liveChatStatus.ESTABLISHED, liveChatStatus.CONNECTING].includes(context.state.liveChat.status)) {
    console.info('live-chat-handlers: polling live agent');

    const chatRequestSuccess = (data) => {
      console.info('chatRequestSuccess!', data);
      context.dispatch('pushLiveChatMessage', {
        type: 'bot',
        text: establishedMsg,
      });      
    }

    const chatEstablished = (data) => {
      console.info('Established!', data);
      context.dispatch('liveChatAgentJoined');
      context.commit('setIsLiveChatProcessing', false);      
      context.dispatch('pushLiveChatMessage', {
        type: 'bot',
        text: `${data.message.name} ${joinedMsg}`,
      });
    }

    const convertLinks = (text) => {
      const regex = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/, 'sg');
      let cookedText = text.replace(/~!/g, '[').replace(/!~/g, ']')
      let m;
      while ((m = regex.exec(cookedText)) !== null) {
        console.log(`Matched ${m[0]}`)
        cookedText = cookedText.replace(m[0], `(${m[0]})`)
      }
      return cookedText
    }

    const chatMessage = (data) => {
      context.commit('clearLiveChatIntervalId');
      context.commit('setIsLiveChatProcessing', false);

      const cookedText = convertLinks(data.message.text)

      context.dispatch('pushLiveChatMessage', {
        type: 'agent',
        text: cookedText,
        alts: {
          markdown: cookedText,
        },        
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
        type: 'bot',
        text: 'Agent has ended the session',
      });      
      context.dispatch('liveChatSessionEnded');
    }
    
    const chatRequestFail = (element) => {
      console.info('Chat request failed:' + element.message.reason)
      context.commit('setIsLiveChatProcessing', false);
      context.dispatch('pushLiveChatMessage', {
        type: 'bot',
        text: 'Unable to connect with an agent.',
      });  
      context.dispatch('liveChatSessionEnded');
    }

    const config = {
      method: 'post',
      url: `${context.state.config.live_agent.endpoint}/getMessage`,
      timeout: 1000,
      data: {
        session,
        targetLanguage: context.state.lex.targetLanguage
      }
    };
    await axiosWithRetry(config)
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
              // console.info(JSON.stringify(context.state.messages))
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
            case 'ChatRequestFail':
              chatRequestFail(element);
              break;
            default:
              console.error(`Unknown message type:${type}`)
          }
        })
        return Promise.resolve();
      }).catch((error) => {
        if (error.code === 'ECONNABORTED') {
          //console.info('No messages after poll interval');  
        } else {
          console.info(`unsuccessful connection ${JSON.stringify(error)}`);
        }
      }).finally(() => {
        //console.info('Sleeping');
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
        sourceLanguage: context.state.lex.targetLanguage,
        targetLanguage: 'en'    // This is always EN    
    },
  };
  return axiosWithRetry(config)
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
  await axiosWithRetry(config)
    .then((response) => {
      console.info(response);
      context.dispatch('pushLiveChatMessage', {
        type: 'bot',
        text: 'Session ended',
      });
      return Promise.resolve();
    }).catch((error) => {
      console.info(`unsuccessful end chat ${JSON.stringify(error)}`);
    })

  context.dispatch('liveChatSessionEnded');
};
