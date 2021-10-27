<template>
  <v-layout
    class="footer"
    align="start"
    justify="space-around"
  >
    <v-btn v-on:click="handleSaveChat" class="footer-btn">
      Save Chat
    </v-btn>
    <v-btn v-on:click="handleLanguage" class="footer-btn">
      Language
    </v-btn>
    <v-btn v-on:click="handleEndChat" class="footer-btn">
      End Chat
    </v-btn>
  </v-layout>
</template>

<script>
  export default {
    data: () => ({}),
    methods: {
      handleLanguage() {
         this.$emit('languageClicked')
      },
      handleSaveChat() {
         this.$emit('saveChatClicked')
      },
      handleEndChat() {
         this.$emit('endChatClicked')
      }
    }
  }
</script>

<style>
.footer {
  position: relative;
  background: linear-gradient(180deg, #084897 0%, #001A72 100%) !important;
  padding-top: 20px !important;
  padding-bottom: 20px !important;
}

.footer-btn {
  text-transform: none !important;
  color: #001A72 !important;
  border-radius: 5px !important;
}

.footer-btn:hover {
  background: #ffc107 !important;
}
</style>