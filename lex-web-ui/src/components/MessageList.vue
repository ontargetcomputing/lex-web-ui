<template>
  <div aria-live="polite" class="layout message-list column">
    <message
      ref="messages"
      v-for="message in messages"
      v-bind:message="message"
      v-bind:key="message.id"
      v-bind:class="`message-${message.type}`"
      v-on:scrollDown="scrollDown"
    ></message>
    <MessageLoading v-if="loading"></MessageLoading>
  </div>
</template>

<script>
/*
Copyright 2017-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/
import Message from "./Message";
import MessageLoading from "./MessageLoading";

export default {
  name: "message-list",
  components: {
    Message,
    MessageLoading
  },
  computed: {
    messages() {
      return this.$store.state.messages;
    },
    loading() {
      return (
        this.$store.state.lex.isProcessing ||
        this.$store.state.liveChat.isProcessing
      );
    }
  },
  watch: {
    // autoscroll message list to the bottom when messages change
    messages() {
      this.scrollDown();
    },
    loading() {
      this.scrollDown();
    }
  },
  mounted() {
    setTimeout(() => {
      this.scrollDown();
    }, 1000);
  },
  methods: {
    scrollDown() {
      return this.$nextTick(() => {
        if (this.$el.lastElementChild) {
          const lastMessageHeight = this.$el.lastElementChild.getBoundingClientRect()
            .height;
          const isLastMessageLoading = this.$el.lastElementChild.classList.contains(
            "messsge-loading"
          );
          if (isLastMessageLoading) {
            this.$el.scrollTop = this.$el.scrollHeight;
          } else {
            this.$el.scrollTop = this.$el.scrollHeight - lastMessageHeight;
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.message-bot {
  flex: none;
}
.message-human,
.message-feedback,
.message-humanClickedButton {
  display: flex;
  flex-direction: column;
  align-items: end;
  flex: none;
}
.message-bot:before {
  content: "Miles:";
  border-radius: 5px;
  background: linear-gradient(180deg, #ffd457 0%, #ffc107 100%);
  color: #203376;
  height: 24px;
  padding: 3px 9px;
}
.message-human:before,
.message-feedback:before,
.message-humanClickedButton:before {
  content: "Me:";
  border-radius: 5px;
  background: linear-gradient(180deg, #084897 0%, #001a72 100%);
  color: #fff;
  padding: 3px 12px;
  margin-right: 7px;
  width: 48px;
}
.message-list {
  padding: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  height: 95%;
}
.message-bot .message-text {
  border-radius: 0 !important;
  border-left: 0.15em solid #ffc107 !important;
  padding: 0 !important;
}
</style>
