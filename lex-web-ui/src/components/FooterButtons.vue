<template>
  <v-layout
    class="footer"
    align="start"
    justify="space-around"
  >
    <v-btn v-on:click="handleSaveChat" class="footer-btn">
      <div v-if="language == 'hy'">պահպանել զրույցը</div>
      <div v-if="language == 'ar'">حفظ الدردشة</div>
      <div v-if="language == 'zh-TW'">保存聊天</div>
      <div v-if="language == 'en'">Save Chat</div>
      <div v-if="language == 'hi'">चैट सहेजें</div>
      <div v-if="language == 'ja'">チャットを保存</div>
      <div v-if="language == 'ko'">채팅 저장</div>
      <div v-if="language == 'fa'">ذخیره چت</div>
      <div v-if="language == 'ru'">Сохранить чат</div>
      <div v-if="language == 'es'">Guardar chat</div>
      <div v-if="language == 'vi'">Lưu trò chuyện</div>
      <div v-if="language == 'tl'">I-save ang Chat</div>
      <div v-if="language == 'th'">บันทึกแชท</div>

    </v-btn>
    <v-btn v-on:click="handleLanguage" class="footer-btn" v-bind:disabled="shouldDisableLanguageButton">
      <div v-if="language == 'hy'">լեզու</div>
      <div v-if="language == 'ar'">لغة</div>
      <div v-if="language == 'zh-TW'">語</div>
      <div v-if="language == 'en'">Language</div>
      <div v-if="language == 'hi'">भाषा: हिन्दी</div>
      <div v-if="language == 'ja'">言語</div>
      <div v-if="language == 'ko'">언어</div>
      <div v-if="language == 'fa'">زبان</div>
      <div v-if="language == 'ru'">Язык</div>
      <div v-if="language == 'es'">Idioma</div>
      <div v-if="language == 'vi'">Ngôn ngữ</div>
      <div v-if="language == 'tl'">Wika</div>
      <div v-if="language == 'th'">ภาษา</div>
    </v-btn>
    <v-btn v-if="!this.$store.state.lex.sessionEnded" v-on:click="handleEndChat" class="footer-btn">
      <div v-if="language == 'hy'">վերջ զրույցը</div>
      <div v-if="language == 'ar'">نهاية المحادثة</div>
      <div v-if="language == 'zh-TW'">結束聊天</div>
      <div v-if="language == 'en'">End Chat</div>
      <div v-if="language == 'hi'">बातचीत बंद करें</div>
      <div v-if="language == 'ja'">チャットを終了する</div>
      <div v-if="language == 'ko'">채팅 종료</div>
      <div v-if="language == 'fa'">پایان چت</div>
      <div v-if="language == 'ru'">конец чат</div>
      <div v-if="language == 'es'">Chat finalizado</div>
      <div v-if="language == 'vi'">Kết thúc cuộc trò chuyện</div>
      <div v-if="language == 'tl'">Tapusin ang chat</div>
      <div v-if="language == 'th'">จบการแชท</div>
    </v-btn>
  </v-layout>
</template>

<script>
  export default {
    data: () => ({}),
    computed: {
      shouldDisableLanguageButton(){
        return this.$store.state.liveChat.status === 'established' || this.$store.state.lex.sessionEnded
      },
      language() {
        return this.$store.state.lex.targetLanguage;
      }
    },
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