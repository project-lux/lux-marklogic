'use strict';
const admin = require('/MarkLogic/admin.xqy');
admin.uiSetBanner({
  active: true,
  label: '%%bannerLabel%%',
  headerColor: '%%bannerHeaderColor%%',
  headerTextColor: '%%bannerHeaderTextColor%%',
  message: null,
});
