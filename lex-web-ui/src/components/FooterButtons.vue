<template>
  <v-row
    class="footer"
    align="start"
    justify="space-around"
  >
    <v-btn class="footer-btn">
      Save Chat
    </v-btn>
    <v-btn class="footer-btn">
      Language
    </v-btn>
    <v-btn class="footer-btn">
      End Chat
    </v-btn>
  </v-row>
</template>

<script>
  export default {
    data: () => ({}),
  }
</script>

<style>
.footer {
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