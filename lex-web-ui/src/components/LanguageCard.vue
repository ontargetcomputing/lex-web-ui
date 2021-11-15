<template>
<div>
  <v-toolbar dark class="language-header">
    <h4 class="headline-text">Change language</h4>
  </v-toolbar>
  <v-container class="language-body">
      <v-layout>
        <img class="logo" src="https://realid.dmv.ca.gov/wp-content/themes/dmv/assets/images/chatbot-icon-circle.png" width="200"/>
      </v-layout>
      <v-layout>
        <h2 class="welcome-text">WELCOME</h2>
      </v-layout>
      <v-layout>
        <h5 class="body-text">SELECT YOUR PREFERRED LANGUAGE FROM THE LIST <br /> BELOW TO GET STARTED.</h5>
      </v-layout>
      <v-layout>
        <v-flex>
          <div v-if="isEnglishSelected" class="languages">
            <select @change="onChange($event)" class="lang-select" name="languages" id="languages">
              <option value="ar">Arabic</option>
              <option value="hy">Armenian</option>
              <option value="zh-TW">Chinese (Traditional)</option>
              <option disabled value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="per">Persian</option>
              <option value="ru">Russian</option>
              <option value="es">Spanish</option>
              <option value="vi">Vietnamese</option>
              <option value="tl">Tagalog</option>
              <option selected value="">Please select language</option>
            </select>
          </div>
          <div class="languages" v-else>
            <select @change="onChange($event)" class="lang-select" name="languages" id="languages">
              <option disabled value="ar">Arabic</option>
              <option disabled value="hy">Armenian</option>
              <option disabled value="zh-TW">Chinese (Traditional)</option>
              <option value="en">English</option>
              <option disabled value="hi">Hindi</option>
              <option disabled value="ja">Japanese</option>
              <option disabled value="ko">Korean</option>
              <option disabled value="per">Persian</option>
              <option disabled value="ru">Russian</option>
              <option disabled value="es">Spanish</option>
              <option disabled value="vi">Vietnamese</option>
              <option disabled value="tl">Tagalog</option>
              <option selected value="">Please select language</option>
            </select>
          </div>
        </v-flex>
      </v-layout>
      <v-layout>
        <div v-on:click="handleBack" class="back-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
            <path stroke-width="5" fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
          </svg>
        </div>
      </v-layout>
  </v-container>
</div>
</template>


<script>
  export default {
    name: "language-card",
    data: () => ({}),
    computed: {
      isEnglishSelected() {
        return this.$store.state.lex.targetLanguage === 'en';
      }      
    },
    methods: {
      handleBack() {
         this.$emit('clicked')
      },
      onChange(event) {
         this.$store.dispatch('requestLanguageChange', event.target.value)
         // this.$store.commit('setTargetLanguage', event.target.value);
         this.$emit('clicked')
      }
    }
  }
</script>

<style>
.language-header {
  background: linear-gradient(180deg, #FFD457 0%, #FFC107 100%);
}

.headline-text {
  font-style: normal;
  font-weight: 500;
  font-size: 19.2px;
  line-height: 23px;
  margin-bottom: 0;
  color: #001A72;
  font-family: Arial,Helvetica,sans-serif;
}

.language-body {
  background: linear-gradient(180deg, #084897 0%, #001A72 100%);
  max-width: 100% !important;
  display: block;
  height: 999px;
}

.logo {
  width: 15%;
  height: auto;
  margin-left: auto;
  margin-right: auto;
  display: block;
}

.welcome-text {
  color: #FFD457;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
  display: block;
  letter-spacing: 5px;
  font-weight: normal;
  padding: 30px 0;
  text-transform: uppercase;
  font-family: Arial,Helvetica,sans-serif;
}

.body-text {
  font-size: 14px;
  margin-left: auto;
  margin-right: auto;
  display: block;
  text-align: center;
  font-weight: 300;
  padding: 0 0 30px 0;
  text-transform: uppercase;
  color: #ffffff;
  font-family: Arial,Helvetica,sans-serif;
}

.lang-select {
  margin-left: 10%;
  display: block;
  width: 80%;
  text-align: center;
  background: #fff;
}

.back-arrow{
  border-radius: 100px;
  background: #FFC107;
  fill: #001A72;
  font-weight: 600;
  text-align: center;
  font-size: .75em;
  letter-spacing: .05em;
  margin-left: auto;
  margin-right: auto;
  padding: 6px 8px;
  display: block;
  height: 50px;
  width: 50px;
  margin-top: 50px;
}

.back-arrow:hover {
  background: #ffffff;
}

.bi-arrow-left {
  margin-top: 11px;
}

</style>