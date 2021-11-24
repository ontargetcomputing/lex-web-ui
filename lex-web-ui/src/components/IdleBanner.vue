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
      countTimer: 60
    };
  },
  created() {
    if (this.$store.state.idleVue.isIdle) {
    console.log("🚀 ~ file: IdleBanner.vue ~ line 24 ~ created ~ this.$store.state.idleVue", this.$store.state)
      
      let timerId = setInterval(() => {
        this.countTimer -= 1;
        if (!this.$store.state.idleVue.isIdle) clearInterval(timerId);
        
        if (this.countTimer < 1) {
          clearInterval(timerId);
          // Your logout function should be over here
          console.log("logout user....");
        }
      }, 1000);
    }
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
