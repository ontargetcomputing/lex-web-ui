<template>
  <v-toolbar
    app
    fixed
    class="idle-toolbar"
    aria-label="Toolbar with to show idle timer."
  >
    <p class="idle-toolbar-text">
      Are you still there? Please responde within
      <b>{{ counterTimer }}s</b> or this chat will timeout.
    </p>
  </v-toolbar>
</template>
<script>
export default {
  name: "idle-banner",
  computed: {
    counterTimer(){
      return this.$store.state.idleTimeOut/1000
    }
  },
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
