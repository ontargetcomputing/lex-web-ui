<template>
  <v-toolbar
    app
    fixed
    class="idle-toolbar"
    aria-label="Toolbar with to show idle timer."
  >
    <p class="idle-toolbar-text">
      Are you still there? Please responde within
      <b>{{ countTimer }}s</b> or this chat will timeout.
    </p>
  </v-toolbar>
</template>
<script>
export default {
  name: "idle-banner",
  data() {
    return {
      countTimer: this.$store.state.idleTimeOut/1000
    };
  },
  created() {
    let timerId = setInterval(() => {
      this.countTimer -= 1;
      if(this.$store.state.idleTimeOut > 60000) clearInterval(timerId);
      if (this.countTimer < 1) {
        clearInterval(timerId);
        // Your logout function should be over here
        if(!this.$store.state.lex.sessionEnded){
          this.$store.dispatch(
          "endChat",
          "Your chat timed out because you didn't respond to the agent. If you'd like more help, please start a new chat."
        );
        }
        
      }
    }, 1000);
  }
};
</script>
<style>
.idle-toolbar {
  height: 70px;
  background-color: #fec31b !important;
  display: flex;
  justify-content: center;
}
.idle-toolbar .toolbar__content {
  height: 100% !important;
  background: #c85662;
  margin: 0px 12px 0px 12px;
  padding: 0px 10px 0px 10px;
}
.idle-toolbar .toolbar__content .idle-toolbar-text {
  text-align: center;
  font-size: 16px;
  line-height: 24px;
  color: #fff;
  font-style: italic;
  margin: 0px;
}
</style>
