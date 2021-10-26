/*
Copyright 2017-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/

/**
 * Asynchronous store actions
 */

/* eslint no-console: ["error", { allow: ["info", "warn", "error"] }] */
/* eslint spaced-comment: ["error", "always", { "exceptions": ["*"] }] */

import LexAudioRecorder from '@/lib/lex/recorder';
import initRecorderHandlers from '@/store/recorder-handlers';
import { chatMode, liveChatStatus } from '@/store/state';
import { createLiveChatSession, connectLiveChatSession, initLiveChatHandlers, sendChatMessage, sendTypingEvent, requestLiveChatEnd } from '@/store/live-chat-handlers';
import silentOgg from '@/assets/silent.ogg';
import silentMp3 from '@/assets/silent.mp3';

import LexClient from '@/lib/lex/client';
import axios from 'axios';
// import { startsWith } from 'core-js/core/string';
import state from './state';

const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const liveChatTerms = ['live chat', 'livechat', 'agent'];

// non-state variables that may be mutated outside of store
// set via initializers at run time
let awsCredentials;
let pollyClient;
let lexClient;
let audio;
let recorder;
let liveChatSession;

export default {
  /***********************************************************************
   *
   * Initialization Actions
   *
   **********************************************************************/

  initCredentials(context, credentials) {
    switch (context.state.awsCreds.provider) {
      case 'cognito':
        awsCredentials = credentials;
        if (lexClient) {
          lexClient.initCredentials(awsCredentials);
        }
        return context.dispatch('getCredentials');
      case 'parentWindow':
        return context.dispatch('getCredentials');
      default:
        return Promise.reject(new Error('unknown credential provider'));
    }
  },
  getConfigFromParent(context) {
    if (!context.state.isRunningEmbedded) {
      return Promise.resolve({});
    }

    return context.dispatch(
      'sendMessageToParentWindow',
      { event: 'initIframeConfig' },
    )
      .then((configResponse) => {
        if (configResponse.event === 'resolve' &&
            configResponse.type === 'initIframeConfig') {
          return Promise.resolve(configResponse.data);
        }
        return Promise.reject(new Error('invalid config event from parent'));
      });
  },
  initConfig(context, configObj) {
    context.commit('mergeConfig', configObj);
  },
  sendInitialUtterance(context) {
    if (context.state.config.lex.initialUtterance) {
      const message = {
        type: context.state.config.ui.hideButtonMessageBubble ? 'button' : 'human',
        text: context.state.config.lex.initialUtterance,
      };
      context.dispatch('postTextMessage', message);
    }
  },
  initMessageList(context) {
    context.commit('reloadMessages');
    if (context.state.messages &&
      context.state.messages.length === 0 &&
      context.state.config.lex.initialText.length > 0) {
        context.commit('pushMessage', {
          type: 'bot',
          text: context.state.config.lex.initialText,
        });
    }
  },
  initLexClient(context, payload) {
    lexClient = new LexClient({
      botName: context.state.config.lex.botName,
      botAlias: context.state.config.lex.botAlias,
      lexRuntimeClient: payload.v1client,
      botV2Id: context.state.config.lex.v2BotId,
      botV2AliasId: context.state.config.lex.v2BotAliasId,
      botV2LocaleId: context.state.config.lex.v2BotLocaleId,
      lexRuntimeV2Client: payload.v2client,
    });

    context.commit(
      'setLexSessionAttributes',
      context.state.config.lex.sessionAttributes,
    );
    return context.dispatch('getCredentials')
      .then(() => lexClient.initCredentials(awsCredentials));
  },
  initPollyClient(context, client) {
    if (!context.state.recState.isRecorderEnabled) {
      return Promise.resolve();
    }
    pollyClient = client;
    context.commit('setPollyVoiceId', context.state.config.polly.voiceId);
    return context.dispatch('getCredentials')
      .then((creds) => {
        pollyClient.config.credentials = creds;
      });
  },
  initRecorder(context) {
    if (!context.state.config.recorder.enable) {
      context.commit('setIsRecorderEnabled', false);
      return Promise.resolve();
    }
    recorder = new LexAudioRecorder(context.state.config.recorder);

    return recorder.init()
      .then(() => recorder.initOptions(context.state.config.recorder))
      .then(() => initRecorderHandlers(context, recorder))
      .then(() => context.commit('setIsRecorderSupported', true))
      .then(() => context.commit('setIsMicMuted', recorder.isMicMuted))
      .catch((error) => {
        if (['PermissionDeniedError', 'NotAllowedError'].indexOf(error.name)
            >= 0) {
          console.warn('get user media permission denied');
          context.dispatch(
            'pushErrorMessage',
            'It seems like the microphone access has been denied. ' +
            'If you want to use voice, please allow mic usage in your browser.',
          );
        } else {
          console.error('error while initRecorder', error);
        }
      });
  },
  initBotAudio(context, audioElement) {
    if (!context.state.recState.isRecorderEnabled ||
        !context.state.config.recorder.enable
    ) {
      return Promise.resolve();
    }
    if (!audioElement) {
      return Promise.reject(new Error('invalid audio element'));
    }
    audio = audioElement;

    let silentSound;

    // Ogg is the preferred format as it seems to be generally smaller.
    // Detect if ogg is supported (MS Edge doesn't).
    // Can't default to mp3 as it is not supported by some Android browsers
    if (audio.canPlayType('audio/ogg') !== '') {
      context.commit('setAudioContentType', 'ogg');
      silentSound = silentOgg;
    } else if (audio.canPlayType('audio/mp3') !== '') {
      context.commit('setAudioContentType', 'mp3');
      silentSound = silentMp3;
    } else {
      console.error('init audio could not find supportted audio type');
      console.warn(
        'init audio can play mp3 [%s]',
        audio.canPlayType('audio/mp3'),
      );
      console.warn(
        'init audio can play ogg [%s]',
        audio.canPlayType('audio/ogg'),
      );
    }

    console.info('recorder content types: %s', recorder.mimeType);

    audio.preload = 'auto';
    // Load a silent sound as the initial audio. This is used to workaround
    // the requirement of mobile browsers that would only play a
    // sound in direct response to a user action (e.g. click).
    // This audio should be explicitly played as a response to a click
    // in the UI
    audio.src = silentSound;
    // autoplay will be set as a response to a clik
    audio.autoplay = false;

    return Promise.resolve();
  },
  reInitBot(context) {
    if (context.state.config.lex.reInitSessionAttributesOnRestart) {
      context.commit('setLexSessionAttributes', context.state.config.lex.sessionAttributes);
    }
    if (context.state.config.ui.pushInitialTextOnRestart) {
      context.commit('pushMessage', {
        type: 'bot',
        text: context.state.config.lex.initialText,
        alts: {
          markdown: context.state.config.lex.initialText,
        },
      });
    }
    return Promise.resolve();
  },

  /***********************************************************************
   *
   * Audio Actions
   *
   **********************************************************************/

  getAudioUrl(context, blob) {
    let url;

    try {
      url = URL.createObjectURL(blob);
    } catch (err) {
      console.error('getAudioUrl createObjectURL error', err);
      const errorMessage = 'There was an error processing the audio ' +
        `response: (${err})`;
      const error = new Error(errorMessage);
      return Promise.reject(error);
    }

    return Promise.resolve(url);
  },
  setAudioAutoPlay(context) {
    if (audio.autoplay) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      audio.play();
      // eslint-disable-next-line no-param-reassign
      audio.onended = () => {
        context.commit('setAudioAutoPlay', { audio, status: true });
        resolve();
      };
      // eslint-disable-next-line no-param-reassign
      audio.onerror = (err) => {
        context.commit('setAudioAutoPlay', { audio, status: false });
        reject(new Error(`setting audio autoplay failed: ${err}`));
      };
    });
  },
  playAudio(context, url) {
    return new Promise((resolve) => {
      audio.onloadedmetadata = () => {
        context.commit('setIsBotSpeaking', true);
        context.dispatch('playAudioHandler')
          .then(() => resolve());
      };
      audio.src = url;
    });
  },
  playAudioHandler(context) {
    return new Promise((resolve, reject) => {
      const { enablePlaybackInterrupt } = context.state.config.lex;

      const clearPlayback = () => {
        context.commit('setIsBotSpeaking', false);
        const intervalId = context.state.botAudio.interruptIntervalId;
        if (intervalId && enablePlaybackInterrupt) {
          clearInterval(intervalId);
          context.commit('setBotPlaybackInterruptIntervalId', 0);
          context.commit('setIsLexInterrupting', false);
          context.commit('setCanInterruptBotPlayback', false);
          context.commit('setIsBotPlaybackInterrupting', false);
        }
      };

      audio.onerror = (error) => {
        clearPlayback();
        reject(new Error(`There was an error playing the response (${error})`));
      };
      audio.onended = () => {
        clearPlayback();
        resolve();
      };
      audio.onpause = audio.onended;

      if (enablePlaybackInterrupt) {
        context.dispatch('playAudioInterruptHandler');
      }
    });
  },
  playAudioInterruptHandler(context) {
    const { isSpeaking } = context.state.botAudio;
    const {
      enablePlaybackInterrupt,
      playbackInterruptMinDuration,
      playbackInterruptVolumeThreshold,
      playbackInterruptLevelThreshold,
      playbackInterruptNoiseThreshold,
    } = context.state.config.lex;
    const intervalTimeInMs = 200;

    if (!enablePlaybackInterrupt &&
        !isSpeaking &&
        context.state.lex.isInterrupting &&
        audio.duration < playbackInterruptMinDuration
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      const { duration } = audio;
      const end = audio.played.end(0);
      const { canInterrupt } = context.state.botAudio;

      if (!canInterrupt &&
          // allow to be interrupt free in the beginning
          end > playbackInterruptMinDuration &&
          // don't interrupt towards the end
          (duration - end) > 0.5 &&
          // only interrupt if the volume seems to be low noise
          recorder.volume.max < playbackInterruptNoiseThreshold
      ) {
        context.commit('setCanInterruptBotPlayback', true);
      } else if (canInterrupt && (duration - end) < 0.5) {
        context.commit('setCanInterruptBotPlayback', false);
      }

      if (canInterrupt &&
          recorder.volume.max > playbackInterruptVolumeThreshold &&
          recorder.volume.slow > playbackInterruptLevelThreshold
      ) {
        clearInterval(intervalId);
        context.commit('setIsBotPlaybackInterrupting', true);
        setTimeout(() => {
          audio.pause();
        }, 500);
      }
    }, intervalTimeInMs);

    context.commit('setBotPlaybackInterruptIntervalId', intervalId);
  },
  getAudioProperties() {
    return (audio) ?
      {
        currentTime: audio.currentTime,
        duration: audio.duration,
        end: (audio.played.length >= 1) ?
          audio.played.end(0) : audio.duration,
        ended: audio.ended,
        paused: audio.paused,
      } :
      {};
  },

  /***********************************************************************
   *
   * Recorder Actions
   *
   **********************************************************************/

  startConversation(context) {
    context.commit('setIsConversationGoing', true);
    return context.dispatch('startRecording');
  },
  stopConversation(context) {
    context.commit('setIsConversationGoing', false);
  },
  startRecording(context) {
    // don't record if muted
    if (context.state.recState.isMicMuted === true) {
      console.warn('recording while muted');
      context.dispatch('stopConversation');
      return Promise.reject(new Error('The microphone seems to be muted.'));
    }

    context.commit('startRecording', recorder);
    return Promise.resolve();
  },
  stopRecording(context) {
    context.commit('stopRecording', recorder);
  },
  getRecorderVolume(context) {
    if (!context.state.recState.isRecorderEnabled) {
      return Promise.resolve();
    }
    return recorder.volume;
  },

  /***********************************************************************
   *
   * Lex and Polly Actions
   *
   **********************************************************************/

  pollyGetBlob(context, text, format = 'text') {
    return context.dispatch('refreshAuthTokens')
      .then(() => context.dispatch('getCredentials'))
      .then((creds) => {
        pollyClient.config.credentials = creds;
        const synthReq = pollyClient.synthesizeSpeech({
          Text: text,
          VoiceId: context.state.polly.voiceId,
          OutputFormat: context.state.polly.outputFormat,
          TextType: format,
        });
        return synthReq.promise();
      })
      .then((data) => {
        const blob = new Blob([data.AudioStream], { type: data.ContentType });
        return Promise.resolve(blob);
      });
  },
  pollySynthesizeSpeech(context, text, format = 'text') {
    return context.dispatch('pollyGetBlob', text, format)
      .then(blob => context.dispatch('getAudioUrl', blob))
      .then(audioUrl => context.dispatch('playAudio', audioUrl));
  },
  interruptSpeechConversation(context) {
    if (!context.state.recState.isConversationGoing &&
        !context.state.botAudio.isSpeaking
    ) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      context.dispatch('stopConversation')
        .then(() => context.dispatch('stopRecording'))
        .then(() => {
          if (context.state.botAudio.isSpeaking) {
            audio.pause();
          }
        })
        .then(() => {
          let count = 0;
          const countMax = 20;
          const intervalTimeInMs = 250;
          context.commit('setIsLexInterrupting', true);
          const intervalId = setInterval(() => {
            if (!context.state.lex.isProcessing) {
              clearInterval(intervalId);
              context.commit('setIsLexInterrupting', false);
              resolve();
            }
            if (count > countMax) {
              clearInterval(intervalId);
              context.commit('setIsLexInterrupting', false);
              reject(new Error('interrupt interval exceeded'));
            }
            count += 1;
          }, intervalTimeInMs);
        });
    });
  },
  playSound(context, fileUrl) {
    document.getElementById('sound').innerHTML = `<audio autoplay="autoplay"><source src="${fileUrl}" type="audio/mpeg" /><embed hidden="true" autostart="true" loop="false" src="${fileUrl}" /></audio>`;
  },
  postTextMessage(context, message) {
    if (context.state.isSFXOn && !context.state.lex.isPostTextRetry) {
      context.dispatch('playSound', context.state.config.ui.messageSentSFX);
    }

    return context.dispatch('interruptSpeechConversation')
      .then(() => {
        if (context.state.chatMode === chatMode.BOT) {
          return context.dispatch('pushMessage', message);
        }
        return Promise.resolve();
      })
      .then(() => {
        let postToLex = true;
        /* eslint-disable no-else-return, max-len */
        if (context.state.config.ui.enableLiveChat && liveChatTerms.find((el) => el === message.text.toLowerCase())) {
          return context.dispatch('requestLiveChat');
        } else if (context.state.liveChat.status === liveChatStatus.VERIFIED) {
          if (message.text.toLowerCase() === 'yes' || message.text.toLowerCase() === 'y') {
            context.commit('setVerifyLiveChat', (message.text.toLowerCase() === 'yes' || message.text.toLowerCase() === 'y'));
            return context.dispatch('requestLiveChat');
          } else {
            postToLex = false;
            context.dispatch('pushLiveChatMessage', {
              type: 'bot',
              text: 'TODO: Livechat session aborted, returning you to Miles',
            });
            context.dispatch('liveChatSessionEnded');
          }
        // } else if (context.state.liveChat.status === liveChatStatus.REQUEST_USERNAME) {
        //   context.commit('setLiveChatUserName', message.text);
        //   return context.dispatch('requestLiveChat');
        } else if (context.state.liveChat.status === liveChatStatus.REQUEST_FIRSTNAME) {
          context.commit('setLiveChatFirstName', message.text);
          return context.dispatch('requestLiveChat');
        } else if (context.state.liveChat.status === liveChatStatus.REQUEST_LASTNAME) {
          context.commit('setLiveChatLastName', message.text);
          return context.dispatch('requestLiveChat');
        } else if (context.state.liveChat.status === liveChatStatus.REQUEST_EMAIL) {
          context.commit('setLiveChatEmail', message.text);
          return context.dispatch('requestLiveChat');
        } else if (context.state.chatMode === chatMode.LIVECHAT) {
          if (context.state.liveChat.status === liveChatStatus.ESTABLISHED) {
            return context.dispatch('sendChatMessage', message.text);
          }
        }
        /* eslint-enable */
        // return Promise.resolve(context.commit('pushUtterance', message.text));
        context.commit('pushUtterance', message.text);
        return Promise.resolve(postToLex);
      })
      .then((postToLex) => {
        console.info(`PostToLex = ${postToLex}`);
        if (postToLex && context.state.chatMode === chatMode.BOT
          && context.state.liveChat.status !== liveChatStatus.REQUEST_USERNAME) {
          return context.dispatch('lexPostText', message.text);
        }
        return false;
      })
      .then((response) => {
        if (response !== false && context.state.chatMode === chatMode.BOT &&
          context.state.liveChat.status != liveChatStatus.REQUEST_USERNAME) {
          // check for an array of messages
          if (response.sessionState || (response.message && response.message.includes('{"messages":'))) {
            if (response.message && response.message.includes('{"messages":')) {
              const tmsg = JSON.parse(response.message);
              if (tmsg && Array.isArray(tmsg.messages)) {
                tmsg.messages.forEach((mes, index) => {
                  let alts = JSON.parse(response.sessionAttributes.appContext || '{}').altMessages;
                  if (mes.type === 'CustomPayload' || mes.contentType === 'CustomPayload') {
                    if (alts === undefined) {
                      alts = {};
                    }
                    alts.markdown = mes.value ? mes.value : mes.content;
                  }
                  // Note that Lex V1 only supported a single responseCard. V2 supports multiple response cards.
                  // This code still supports the V1 mechanism. The code below will check for
                  // the existence of a single V1 responseCard added to sessionAttributes.appContext by bots
                  // such as QnABot. This single responseCard will be appended to the last message displayed
                  // in the array of messages presented.
                  let responseCardObject = JSON.parse(response.sessionAttributes.appContext || '{}').responseCard;
                  if (responseCardObject === undefined) { // prefer appContext over lex.responseCard
                    responseCardObject = context.state.lex.responseCard;
                  }
                  if ((mes.value && mes.value.length > 0) ||
                    (mes.content && mes.content.length > 0)) {
                    context.dispatch(
                      'pushMessage',
                      {
                        text: mes.value ? mes.value : mes.content,
                        type: 'bot',
                        dialogState: context.state.lex.dialogState,
                        responseCard: tmsg.messages.length - 1 === index // attach response card only
                          ? responseCardObject : undefined, // for last response message
                        alts,
                      },
                    );
                  }
                });
              }
            }
          } else {
            let alts = JSON.parse(response.sessionAttributes.appContext || '{}').altMessages;
            let responseCardObject = JSON.parse(response.sessionAttributes.appContext || '{}').responseCard;
            if (response.messageFormat === 'CustomPayload') {
              if (alts === undefined) {
                alts = {};
              }
              alts.markdown = response.message;
            }
            if (responseCardObject === undefined) {
              responseCardObject = context.state.lex.responseCard;
            }
            context.dispatch(
              'pushMessage',
              {
                text: response.message,
                type: 'bot',
                dialogState: context.state.lex.dialogState,
                responseCard: responseCardObject, // prefering appcontext over lex.responsecard
                alts,
              },
            );
          }
        }
        return Promise.resolve();
      })
      .then(() => {
        if (context.state.isSFXOn) {
          context.dispatch('playSound', context.state.config.ui.messageReceivedSFX);
          context.dispatch(
            'sendMessageToParentWindow',
            { event: 'messageReceived' },
          );
        }
        if (context.state.lex.dialogState === 'Fulfilled') {
          context.dispatch('reInitBot');
        }
        if (context.state.isPostTextRetry) {
          context.commit('setPostTextRetry', false);
        }
      })
      .catch((error) => {
        if (((error.message.indexOf('permissible time') === -1))
          || context.state.config.lex.retryOnLexPostTextTimeout === false
          || (context.state.lex.isPostTextRetry &&
            (context.state.lex.retryCountPostTextTimeout >=
              context.state.config.lex.retryCountPostTextTimeout)
          )
        ) {
          context.commit('setPostTextRetry', false);
          const errorMessage = (context.state.config.ui.showErrorDetails) ?
            ` ${error}` : '';
          console.error('error in postTextMessage', error);
          context.dispatch(
            'pushErrorMessage',
            'Sorry, I was unable to process your message. Try again later.' +
            `${errorMessage}`,
          );
        } else {
          context.commit('setPostTextRetry', true);
          context.dispatch('postTextMessage', message);
        }
      });
  },
  deleteSession(context) {
    context.commit('setIsLexProcessing', true);
    return context.dispatch('refreshAuthTokens')
      .then(() => context.dispatch('getCredentials'))
      .then(() => lexClient.deleteSession())
      .then((data) => {
        context.commit('setIsLexProcessing', false);
        return context.dispatch('updateLexState', data)
          .then(() => Promise.resolve(data));
      })
      .catch((error) => {
        console.error(error);
        context.commit('setIsLexProcessing', false);
      });
  },
  startNewSession(context) {
    context.commit('setIsLexProcessing', true);
    return context.dispatch('refreshAuthTokens')
      .then(() => context.dispatch('getCredentials'))
      .then(() => lexClient.startNewSession())
      .then((data) => {
        context.commit('setIsLexProcessing', false);
        return context.dispatch('updateLexState', data)
          .then(() => Promise.resolve(data));
      })
      .catch((error) => {
        console.error(error);
        context.commit('setIsLexProcessing', false);
      });
  },
  lexPostText(context, text) {
    context.commit('setIsLexProcessing', true);
    context.commit('reapplyTokensToSessionAttributes');
    const session = context.state.lex.sessionAttributes;
    delete session.appContext;
    const localeId = context.state.config.lex.v2BotLocaleId
      ? context.state.config.lex.v2BotLocaleId.split(',')[0]
      : undefined;
    return context.dispatch('refreshAuthTokens')
      .then(() => context.dispatch('getCredentials'))
      .then(() => lexClient.postText(text, localeId, session))
      .then((data) => {
        context.commit('setIsLexProcessing', false);
        return context.dispatch('updateLexState', data)
          .then(() => Promise.resolve(data));
      })
      .catch((error) => {
        context.commit('setIsLexProcessing', false);
        throw error;
      });
  },
  lexPostContent(context, audioBlob, offset = 0) {
    context.commit('setIsLexProcessing', true);
    context.commit('reapplyTokensToSessionAttributes');
    const session = context.state.lex.sessionAttributes;
    delete session.appContext;
    console.info('audio blob size:', audioBlob.size);
    let timeStart;

    return context.dispatch('refreshAuthTokens')
      .then(() => context.dispatch('getCredentials'))
      .then(() => {
        const localeId = context.state.config.lex.v2BotLocaleId
          ? context.state.config.lex.v2BotLocaleId.split(',')[0]
          : undefined;
        timeStart = performance.now();
        return lexClient.postContent(
          audioBlob,
          localeId,
          session,
          context.state.lex.acceptFormat,
          offset,
        );
      })
      .then((lexResponse) => {
        const timeEnd = performance.now();
        console.info(
          'lex postContent processing time:',
          ((timeEnd - timeStart) / 1000).toFixed(2),
        );
        context.commit('setIsLexProcessing', false);
        return context.dispatch('updateLexState', lexResponse)
          .then(() => (
            context.dispatch('processLexContentResponse', lexResponse)
          ))
          .then(blob => Promise.resolve(blob));
      })
      .catch((error) => {
        context.commit('setIsLexProcessing', false);
        throw error;
      });
  },
  processLexContentResponse(context, lexData) {
    const { audioStream, contentType, dialogState } = lexData;

    return Promise.resolve()
      .then(() => {
        if (!audioStream || !audioStream.length) {
          const text = (dialogState === 'ReadyForFulfillment') ?
            'All done' :
            'There was an error';
          return context.dispatch('pollyGetBlob', text);
        }

        return Promise.resolve(new Blob([audioStream], { type: contentType }));
      });
  },
  updateLexState(context, lexState) {
    const lexStateDefault = {
      dialogState: '',
      inputTranscript: '',
      intentName: '',
      message: '',
      responseCard: null,
      sessionAttributes: {},
      slotToElicit: '',
      slots: {},
    };
    // simulate response card in sessionAttributes
    // used mainly for postContent which doesn't support response cards
    if ('sessionAttributes' in lexState &&
      'appContext' in lexState.sessionAttributes
    ) {
      try {
        const appContext = JSON.parse(lexState.sessionAttributes.appContext);
        if ('responseCard' in appContext) {
          lexStateDefault.responseCard =
            appContext.responseCard;
        }
      } catch (e) {
        const error =
          new Error(`error parsing appContext in sessionAttributes: ${e}`);
        return Promise.reject(error);
      }
    }
    context.commit('updateLexState', { ...lexStateDefault, ...lexState });
    if (context.state.isRunningEmbedded) {
      context.dispatch(
        'sendMessageToParentWindow',
        { event: 'updateLexState', state: context.state.lex },
      );
    }
    return Promise.resolve();
  },

  /***********************************************************************
   *
   * Message List Actions
   *
   **********************************************************************/

  pushMessage(context, message) {
    if (context.state.lex.isPostTextRetry === false) {
      context.commit('pushMessage', message);
    }
  },
  pushLiveChatMessage(context, message) {
    context.commit('pushLiveChatMessage', message);
  },
  pushErrorMessage(context, text, dialogState = 'Failed') {
    context.commit('pushMessage', {
      type: 'bot',
      text,
      dialogState,
    });
  },

  /***********************************************************************
   *
   * Live Chat Actions
   *
   **********************************************************************/
  initLiveChat(context) {
    console.info('***** RDB actions.initLiveChat does nothing');
    // require('amazon-connect-chatjs');
    // if (window.connect) {
    //   window.connect.ChatSession.setGlobalConfig({
    //     region: context.state.config.region,
    //   });
    //   return Promise.resolve();
    // } else {
    //   return Promise.reject(new Error('failed to find Connect Chat JS global variable'));
    // }
  },

  initLiveChatSession(context) {
    console.info('************ RDB - actions.initLiveChatSession');
    console.info('initLiveChat');
    console.info('config connect', context.state.config.connect);
    if (!context.state.config.ui.enableLiveChat) {
      console.error('error in initLiveChatSession() enableLiveChat is not true in config');
      return Promise.reject(new Error('error in initLiveChatSession() enableLiveChat is not true in config'));
    }
    if (!context.state.config.live_agent.endpoint) {
      console.error('error in initLiveChatSession() endpoint is not set in config');
      return Promise.reject(new Error('error in initLiveChatSession() endpoint is not set in config'));
    }

    context.commit('setLiveChatStatus', liveChatStatus.INITIALIZING);

    const createCaseConfig = {
      method: 'post',
      url: `${context.state.config.live_agent.endpoint}/createCase`,
    };
    return axios(createCaseConfig)
      .then((result) => {
        console.info('Live Chat Config Success:', result);
        context.commit('setLiveChatStatus', liveChatStatus.CONNECTING);
        function waitMessage(context, type, message) {
          context.commit('pushLiveChatMessage', {
            type,
            text: message,
          });
        };
        if (context.state.config.live_agent.waitingForAgentMessageIntervalSeconds > 0) {
          const intervalID = setInterval(waitMessage,
            1000 * context.state.config.live_agent.waitingForAgentMessageIntervalSeconds,
            context,
            'bot',
            context.state.config.live_agent.waitingForAgentMessage);
          console.info(`interval now set: ${intervalID}`);
          context.commit('setLiveChatIntervalId', intervalID);
        }
        return createLiveChatSession(context);
      }).then((liveChatSessionResponse) => {
        liveChatSession = liveChatSessionResponse;
        console.info('Live Chat Session Created:', liveChatSession);
        initLiveChatHandlers(context, liveChatSession);
        console.info('Live Chat Handlers initialised:');
        // RDB TODO
        return connectLiveChatSession(liveChatSession, context);
      })
      .then((response) => {
        console.info('live Chat session connection response', response);
        console.info('Live Chat Session CONNECTED');
        context.commit('setLiveChatStatus', liveChatStatus.ESTABLISHED);
        // RDB TODO
        // context.commit('setLiveChatbotSession', liveChatSession);
        return Promise.resolve();
      })
      .catch((error) => {
        console.error('Error esablishing live chat');
        console.error(error);
        // context.commit('setLiveChatStatus', liveChatStatus.ENDED);
        context.commit('setLiveChatStatus', liveChatStatus.DISCONNECTED);
        return Promise.resolve();
      });
  },

  async requestLiveChat(context) {
    console.info(`actions.requestLiveChat with status=${context.state.liveChat.status}`);
    if (context.state.liveChat.status === liveChatStatus.DISCONNECTED) {
      console.info('actions.requestingLiveChat - verifying live chat');
      const agentWaitConfig = {
        method: 'post',
        url: `${context.state.config.live_agent.endpoint}/agentWaitTime`,
      };
      context.commit('setChatMode', chatMode.LIVECHAT);
      await axios(agentWaitConfig)
        .then((response) => {
          // RDB - TODO - what do I do with these?
          // const liveAgentAvailable = response.data[0].outputValues.liveAgentAvailable;
          context.commit('setLiveChatStatus', liveChatStatus.VERIFIED);
          const { waitTime } = response.data[0].outputValues;
          context.commit(
            'pushMessage',
            {
              text: `The wait time is currently ${waitTime}, would you like to wait?`,
              type: 'bot',
            },
          );
        })
        .catch((error) => {
          console.error('Error determining live chat wait times');
          console.error(error);
          // context.commit('setLiveChatStatus', liveChatStatus.ENDED);
          context.commit('setLiveChatStatus', liveChatStatus.DISCONNECTED);
        });
    } else if (context.state.liveChat.status === liveChatStatus.VERIFIED) {
      if (context.state.liveChat.verifyLiveChat === true) {
        console.info('actions.requestLiveChat - requesting firstname');
        context.commit('setLiveChatStatus', liveChatStatus.REQUEST_FIRSTNAME);
        context.commit(
          'pushMessage',
          {
            text: context.state.config.live_agent.promptForFirstNameMessage,
            type: 'bot',
          },
        );
      } else {
        console.info('actions.requestingLiveChat - disconnecting live chat');
        context.commit(
          'pushMessage',
          {
            text: context.state.config.live_agent.disconnectingMessage,
            type: 'bot',
          },
        );
        context.dispatch('liveChatSessionEnded');
      }
    } else if (context.state.liveChat.status === liveChatStatus.REQUEST_FIRSTNAME) {
      console.info('actions.requestLiveChat - requesting lastname');
      context.commit('setLiveChatStatus', liveChatStatus.REQUEST_LASTNAME);
      context.commit(
        'pushMessage',
        {
          text: context.state.config.live_agent.promptForLastNameMessage,
          type: 'bot',
        },
      );
    } else if (context.state.liveChat.status === liveChatStatus.REQUEST_LASTNAME) {
      console.info('actions.requestLiveChat - requesting email');
      context.commit('setLiveChatStatus', liveChatStatus.REQUEST_EMAIL);
      context.commit(
        'pushMessage',
        {
          text: context.state.config.live_agent.promptForEmailAddressMessage,
          type: 'bot',
        },
      );
    } else if (context.state.liveChat.status === liveChatStatus.REQUEST_EMAIL) {
      console.info('actions.requestLiveChat - initiating livechat');
      console.info(`Username: ${context.getters.liveChatUserName()}`);
      context.commit('setLiveChatStatus', liveChatStatus.REQUESTED);
      context.commit('setChatMode', chatMode.LIVECHAT);
      context.commit('setIsLiveChatProcessing', true);
      context.dispatch('initLiveChatSession');
    }
  },
  sendTypingEvent(context) {
    console.info('actions.sendTypingEvent');
    if (context.state.chatMode === chatMode.LIVECHAT && liveChatSession) {
      sendTypingEvent(liveChatSession);
    }
  },
  sendChatMessage(context, message) {
    console.info('actions.sendChatMessage');
    if (context.state.chatMode === chatMode.LIVECHAT && liveChatSession) {
      sendChatMessage(context, liveChatSession, message);
    }
  },
  requestLiveChatEnd(context) {
    console.info('actions.endLiveChat');
    context.commit('clearLiveChatIntervalId');
    if (context.state.chatMode === chatMode.LIVECHAT && liveChatSession) {
      console.info('actdions - requesting live chat end');
      requestLiveChatEnd(context, liveChatSession);
      // context.commit('setLiveChatStatus', liveChatStatus.ENDED);
      context.commit('setLiveChatStatus', liveChatStatus.DISCONNECTED);
    }
  },
  requestLanguageChange(context) {
    context.commit('setTargetLanguage', 'RDB FIXME TODO');
  },
  agentIsTyping(context) {
    console.info('actions.agentIsTyping');
    context.commit('setIsLiveChatProcessing', true);
  },
  agentIsNotTyping(context) {
    console.info('actions.agentIsNotTyping');
    context.commit('setIsLiveChatProcessing', false);
  },
  liveChatSessionReconnectRequest(context) {
    console.info('actions.liveChatSessionReconnectRequest');
    context.commit('setLiveChatStatus', liveChatStatus.DISCONNECTED);
    // TODO try re-establish connection
  },
  liveChatSessionEnded(context) {
    console.info('actions.liveChatSessionEnded');
    liveChatSession = null;
    context.commit('setLiveChatStatus', liveChatStatus.DISCONNECTED);
    // context.commit('setLiveChatStatus', liveChatStatus.ENDED);
    context.commit('setChatMode', chatMode.BOT);
    context.commit('clearLiveChatIntervalId');
  },
  liveChatAgentJoined(context) {
    console.info('actions.liveChatAgentJoined');
    context.commit('clearLiveChatIntervalId');
  },
  /***********************************************************************
   *
   * Credentials Actions
   *
   **********************************************************************/

  getCredentialsFromParent(context) {
    const expireTime = (awsCredentials && awsCredentials.expireTime) ?
      awsCredentials.expireTime : 0;
    const credsExpirationDate = new Date(expireTime).getTime();
    const now = Date.now();
    if (credsExpirationDate > now) {
      return Promise.resolve(awsCredentials);
    }
    return context.dispatch('sendMessageToParentWindow', { event: 'getCredentials' })
      .then((credsResponse) => {
        if (credsResponse.event === 'resolve' &&
            credsResponse.type === 'getCredentials') {
          return Promise.resolve(credsResponse.data);
        }
        const error = new Error('invalid credential event from parent');
        return Promise.reject(error);
      })
      .then((creds) => {
        const { AccessKeyId, SecretKey, SessionToken } = creds.data.Credentials;
        const { IdentityId } = creds.data;
        // recreate as a static credential
        awsCredentials = {
          accessKeyId: AccessKeyId,
          secretAccessKey: SecretKey,
          sessionToken: SessionToken,
          identityId: IdentityId,
          expired: false,
          getPromise() { return Promise.resolve(awsCredentials); },
        };

        return awsCredentials;
      });
  },
  getCredentials(context) {
    if (context.state.awsCreds.provider === 'parentWindow') {
      return context.dispatch('getCredentialsFromParent');
    }
    return awsCredentials.getPromise()
      .then(() => awsCredentials);
  },

  /***********************************************************************
   *
   * Auth Token Actions
   *
   **********************************************************************/

  refreshAuthTokensFromParent(context) {
    return context.dispatch('sendMessageToParentWindow', { event: 'refreshAuthTokens' })
      .then((tokenResponse) => {
        if (tokenResponse.event === 'resolve' &&
          tokenResponse.type === 'refreshAuthTokens') {
          return Promise.resolve(tokenResponse.data);
        }
        if (context.state.isRunningEmbedded) {
          const error = new Error('invalid refresh token event from parent');
          return Promise.reject(error);
        }
        return Promise.resolve('outofbandrefresh');
      })
      .then((tokens) => {
        if (context.state.isRunningEmbedded) {
          context.commit('setTokens', tokens);
        }
        return Promise.resolve();
      });
  },
  refreshAuthTokens(context) {
    function isExpired(token) {
      if (token) {
        const decoded = jwt.decode(token, { complete: true });
        if (decoded) {
          const now = Date.now();
          // calculate and expiration time 5 minutes sooner and adjust to milliseconds
          // to compare with now.
          const expiration = (decoded.payload.exp - (5 * 60)) * 1000;
          if (now > expiration) {
            return true;
          }
          return false;
        }
        return false;
      }
      return false;
    }

    if (context.state.tokens.idtokenjwt && isExpired(context.state.tokens.idtokenjwt)) {
      console.info('starting auth token refresh');
      return context.dispatch('refreshAuthTokensFromParent');
    }
    return Promise.resolve();
  },

  /***********************************************************************
   *
   * UI and Parent Communication Actions
   *
   **********************************************************************/

  toggleIsUiMinimized(context) {
    context.commit('toggleIsUiMinimized');
    return context.dispatch(
      'sendMessageToParentWindow',
      { event: 'toggleMinimizeUi' },
    );
  },
  toggleIsLoggedIn(context) {
    context.commit('toggleIsLoggedIn');
    return context.dispatch(
      'sendMessageToParentWindow',
      { event: 'toggleIsLoggedIn' },
    );
  },
  toggleHasButtons(context) {
    context.commit('toggleHasButtons');
    return context.dispatch(
      'sendMessageToParentWindow',
      { event: 'toggleHasButtons' },
    );
  },
  toggleIsSFXOn(context) {
    context.commit('toggleIsSFXOn');
  },
  /**
   * sendMessageToParentWindow will either dispatch an event using a CustomEvent to a handler when
   * the lex-web-ui is running as a VUE component on a page or will send a message via postMessage
   * to a parent window if an iFrame is hosting the VUE component on a parent page.
   * isRunningEmbedded === true indicates running withing an iFrame on a parent page
   * isRunningEmbedded === false indicates running as a VUE component directly on a page.
   * @param context
   * @param message
   * @returns {Promise<any>}
   */
  sendMessageToParentWindow(context, message) {
    if (!context.state.isRunningEmbedded) {
      return new Promise((resolve, reject) => {
        try {
          const myEvent = new CustomEvent('fullpagecomponent', { detail: message });
          document.dispatchEvent(myEvent);
          resolve(myEvent);
        } catch (err) {
          reject(err);
        }
      });
    }
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (evt) => {
        messageChannel.port1.close();
        messageChannel.port2.close();
        if (evt.data.event === 'resolve') {
          resolve(evt.data);
        } else {
          const errorMessage =
            `error in sendMessageToParentWindow: ${evt.data.error}`;
          reject(new Error(errorMessage));
        }
      };
      let target = context.state.config.ui.parentOrigin;
      if (target !== window.location.origin) {
        // simple check to determine if a region specific path has been provided
        const p1 = context.state.config.ui.parentOrigin.split('.');
        const p2 = window.location.origin.split('.');
        if (p1[0] === p2[0]) {
          target = window.location.origin;
        }
      }
      window.parent.postMessage(
        { source: 'lex-web-ui', ...message },
        target,
        [messageChannel.port2],
      );
    });
  },
  resetHistory(context) {
    context.commit('clearMessages');
    context.commit('pushMessage', {
      type: 'bot',
      text: context.state.config.lex.initialText,
      alts: {
        markdown: context.state.config.lex.initialText,
      },
    });
  },
  changeLocaleIds(context, data) {
    context.commit('updateLocaleIds', data);
  },
};
