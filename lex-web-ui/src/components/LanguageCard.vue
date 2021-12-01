<template>
  <div>
    <v-toolbar class="language-header">
      <h4 class="headline-text">Change language</h4>
    </v-toolbar>
    <v-content>
      <v-container class="language-body">
        <v-layout class="language-content">
          <img
            class="logo"
            src="https://realid.dmv.ca.gov/wp-content/themes/dmv/assets/images/chatbot-icon-circle.png"
          />
        </v-layout>
        <v-layout class="language-content">
          <h2 class="welcome-text">WELCOME</h2>
        </v-layout>
        <v-layout class="language-content">
          <h5 class="body-text">
            SELECT YOUR PREFERRED LANGUAGE FROM THE LIST BELOW TO GET STARTED.
          </h5>
        </v-layout>
        <v-layout class="language-content">
          <v-flex>
            <div v-if="isEnglishSelected" class="languages">
              <select
                @change="onChange($event)"
                class="lang-select"
                name="languages"
                id="languages"
              >
                <option value="ar">Arabic</option>
                <option value="hy">Armenian</option>
                <option value="zh-TW">Chinese (Traditional)</option>
                <option selected disabled value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="fa">Persian</option>
                <option value="ru">Russian</option>
                <option value="es">Spanish</option>
                <option value="vi">Vietnamese</option>
                <option value="tl">Tagalog</option>
                <option value="th">Thai</option>
              </select>
            </div>
            <div class="languages" v-else>
              <select
                @change="onChange($event)"
                class="lang-select"
                name="languages"
                id="languages"
              >
                <option v-if="language == 'ar'" selected disabled value="ar"
                  >Arabic</option
                >
                <option v-else disabled value="ar">Arabic</option>

                <option v-if="language == 'hy'" selected disabled value="hy"
                  >Armenian</option
                >
                <option v-else disabled value="hy">Armenian</option>

                <option
                  v-if="language == 'zh-TW'"
                  selected
                  disabled
                  value="zh-TW"
                  >Chinese (Traditional)</option
                >
                <option v-else disabled value="zh-TW"
                  >Chinese (Traditional)</option
                >

                <option value="en">English</option>

                <option v-if="language == 'hi'" selected disabled value="hi"
                  >Hindi</option
                >
                <option v-else disabled value="hi">Hindi</option>

                <option v-if="language == 'ja'" selected disabled value="ja"
                  >Japanese</option
                >
                <option v-else disabled value="ja">Japanese</option>

                <option v-if="language == 'ko'" selected disabled value="ko"
                  >Korean</option
                >
                <option v-else disabled value="ko">Korean</option>

                <option v-if="language == 'fa'" selected disabled value="fa"
                  >Persian</option
                >
                <option disabled value="fa">Persian</option>

                <option v-if="language == 'ru'" selected disabled value="ru"
                  >Russian</option
                >
                <option v-else disabled value="ru">Russian</option>

                <option v-if="language == 'es'" selected disabled value="es"
                  >Spanish</option
                >
                <option v-else disabled value="es">Spanish</option>

                <option v-if="language == 'vi'" selected disabled value="vi"
                  >Vietnamese</option
                >
                <option v-else disabled value="vi">Vietnamese</option>

                <option v-if="language == 'tl'" selected disabled value="tl"
                  >Tagalog</option
                >
                <option v-else disabled value="tl">Tagalog</option>

                <option v-if="language == 'th'" selected disabled value="th"
                  >Thai</option
                >
                <option v-else disabled value="th">Thai</option>                
              </select>
            </div>
          </v-flex>
        </v-layout>
        <v-layout class="black-arrow-wrapper language-content">
          <div v-on:click="handleBack" class="back-arrow">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              fill="currentColor"
              class="bi bi-arrow-left"
              viewBox="0 0 16 16"
            >
              <path
                stroke="currentColor"
                stroke-width="1"
                fill-rule="evenodd"
                d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
              />
            </svg>
          </div>
        </v-layout>
      </v-container>
    </v-content>
  </div>
</template>

<script>
export default {
  name: "language-card",
  data: () => ({}),
  computed: {
    isEnglishSelected() {
      return this.$store.state.lex.targetLanguage === "en";
    },
    language() {
      return this.$store.state.lex.targetLanguage;
    }

  },
  methods: {
    handleBack() {
      this.$emit("clicked");
    },
    onChange(event) {
      this.$store.dispatch("requestLanguageChange", event.target.value);
      // this.$store.commit('setTargetLanguage', event.target.value);
      this.$emit("clicked");
    }
  }
};
</script>

<style>
.language-header {
  background: linear-gradient(180deg, #ffd457 0%, #ffc107 100%);
  
}
.language-header .toolbar__content{
height: 45px !important;
}

.headline-text {
  font-style: normal;
  font-weight: 500;
  font-size: 19.2px;
  line-height: 23px;
  margin-bottom: 0;
  color: #001a72;
  font-family: Arial, Helvetica, sans-serif;
}

.language-body {
  background: linear-gradient(180deg, #084897 0%, #001a72 100%);
  max-width: 100% !important;
  justify-content: center;
  display: flex;
  flex-direction: column;
  padding: 0px;
  min-height: 100vh !important;
}
.language-content {
  flex: unset !important;
}

.logo {
  width: 83px;
  height: auto;
  margin-left: auto;
  margin-right: auto;
}

.welcome-text {
  color: #ffd457;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
  letter-spacing: 5px;
  font-weight: normal;
  padding: 30px 0;
  text-transform: uppercase;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 27.648px;
}

.body-text {
  font-size: 14px;
  text-align: center;
  font-weight: 300;
  padding: 0 0 30px 0;
  text-transform: uppercase;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  width: 100%;
  line-height: 20px;
}
.languages {
  display: flex;
  justify-content: center;
  height: 20px;
}

.lang-select {
  width: 64%;
  text-align: center;
  background: #fff;
}

.black-arrow-wrapper {
  text-align: center;
  height: 90px;
  display: flex;
  justify-content: center;
  align-items: end;
}

.back-arrow {
  border-radius: 100px;
  background: #ffc107;
  fill: #001a72;
  font-size: 0.75em;
  letter-spacing: 0.05em;
  height: 50px;
  width: 50px;
}

.back-arrow:hover {
  background: #ffffff;
}

.bi-arrow-left {
  margin-top: 11px;
}
</style>
