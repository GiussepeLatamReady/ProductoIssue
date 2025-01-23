/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */

define(['N/search', 'N/file', 'N/log'],

  function(search, file, log) {

    function builder() {

      var str = '';

      str += '<#setting locale = "computer">\n';
      str += '<#setting number_format ="0.00">\n';
      str += '<#assign jsonContent = jsonString.text?eval>\n';
      str += '<#assign number = jsonContent.id>\n';
      str += '<#assign transaction = jsonContent.transaction>\n';
      str += '<#assign subsidiary = jsonContent.subsidiary>\n';
      str += '<#assign _sameCurrency = false>\n';

      return str;

    }

    function getPeriod() {

      var result = {};

      search.create({
        type: "accountingperiod",
        filters: [
          ["isquarter", "is", "F"],
          "AND",
          ["isyear", "is", "F"],
          "AND",
          ["isadjust", "is", "F"]
        ],
        columns: [{
          name: "internalid",
          sort: 'ASC',
        }, {
          name: "periodname",
        }, {
          name: 'formulatext',
          formula: "concat( to_char({enddate},'YYYY') , to_char({enddate},'MM'))"
        }]
      }).run().each(function(line) {

        var name = line.getValue(line.columns[1]);
        var period = line.getValue(line.columns[2]);
        result[period] = name;

        return true;
      });

      JSONPeriods = JSON.stringify(result);

      log.error('period', JSONPeriods);

      var str = '<#function getPeriod periodName>\n';
      str += '<#assign JSONPeriods = ' + JSONPeriods + '>\n'
      str += '<#assign name = "" >\n'
      str += '<#list JSONPeriods?keys as key>\n'
      str += '<#if (JSONPeriods[key] =periodName)>\n'
      str += '<#assign name = key >\n'
      str += '<#break>\n'
      str += '</#if>\n'
      str += '</#list>\n'
      str += '<#return name>\n'
      str += '</#function>\n'
      return str;
    }

    function formatCurrency() {

      var str = '';
      str += '<#function formatCurrency amount type >\n';
      str += '<#assign newAmount = (""+amount)?number>\n';
      //str += '<#assign newAmount = amount>\n';
      str += "<#if (type='nodec')>\n";
      str += '<#assign newAmount = (newAmount*100)?string("0")>\n';
      str += '</#if>\n';
      str += '<#return newAmount>\n';
      str += '</#function>\n';
      return str;

    }

    function formatDate() {

      var str = '';
      str += '<#function formatDate date format >\n';
      str += '<#return date?datetime.iso?string(format)>\n';
      str += '</#function>\n';
      return str;

    }



    function replaceLatinText() {
      var str = '';
      str += '<#function replaceLatinText input>\n';
      str += "<#assign text = input>\n";
      str += "<#assign text = text?replace('Á','A')>\n";
      str += "<#assign text = text?replace('Ă','A')>\n";
      str += "<#assign text = text?replace('Ắ','A')>\n";
      str += "<#assign text = text?replace('Ặ','A')>\n";
      str += "<#assign text = text?replace('Ằ','A')>\n";
      str += "<#assign text = text?replace('Ẳ','A')>\n";
      str += "<#assign text = text?replace('Ẵ','A')>\n";
      str += "<#assign text = text?replace('Ǎ','A')>\n";
      str += "<#assign text = text?replace('Â','A')>\n";
      str += "<#assign text = text?replace('Ấ','A')>\n";
      str += "<#assign text = text?replace('Ậ','A')>\n";
      str += "<#assign text = text?replace('Ầ','A')>\n";
      str += "<#assign text = text?replace('Ẩ','A')>\n";
      str += "<#assign text = text?replace('Ẫ','A')>\n";
      str += "<#assign text = text?replace('Ä','A')>\n";
      str += "<#assign text = text?replace('Ǟ','A')>\n";
      str += "<#assign text = text?replace('Ȧ','A')>\n";
      str += "<#assign text = text?replace('Ǡ','A')>\n";
      str += "<#assign text = text?replace('Ạ','A')>\n";
      str += "<#assign text = text?replace('Ȁ','A')>\n";
      str += "<#assign text = text?replace('À','A')>\n";
      str += "<#assign text = text?replace('Ả','A')>\n";
      str += "<#assign text = text?replace('Ȃ','A')>\n";
      str += "<#assign text = text?replace('Ā','A')>\n";
      str += "<#assign text = text?replace('Ą','A')>\n";
      str += "<#assign text = text?replace('Å','A')>\n";
      str += "<#assign text = text?replace('Ǻ','A')>\n";
      str += "<#assign text = text?replace('Ḁ','A')>\n";
      str += "<#assign text = text?replace('Ⱥ','A')>\n";
      str += "<#assign text = text?replace('Ã','A')>\n";
      str += "<#assign text = text?replace('Ꜳ','AA')>\n";
      str += "<#assign text = text?replace('Æ','AE')>\n";
      str += "<#assign text = text?replace('Ǽ','AE')>\n";
      str += "<#assign text = text?replace('Ǣ','AE')>\n";
      str += "<#assign text = text?replace('Ḃ','B')>\n";
      str += "<#assign text = text?replace('Ḅ','B')>\n";
      str += "<#assign text = text?replace('Ɓ','B')>\n";
      str += "<#assign text = text?replace('Ḇ','B')>\n";
      str += "<#assign text = text?replace('Ƀ','B')>\n";
      str += "<#assign text = text?replace('Ƃ','B')>\n";
      str += "<#assign text = text?replace('Ć','C')>\n";
      str += "<#assign text = text?replace('Č','C')>\n";
      str += "<#assign text = text?replace('Ç','C')>\n";
      str += "<#assign text = text?replace('Ḉ','C')>\n";
      str += "<#assign text = text?replace('Ĉ','C')>\n";
      str += "<#assign text = text?replace('Ċ','C')>\n";
      str += "<#assign text = text?replace('Ƈ','C')>\n";
      str += "<#assign text = text?replace('Ȼ','C')>\n";
      str += "<#assign text = text?replace('Ď','D')>\n";
      str += "<#assign text = text?replace('Ḑ','D')>\n";
      str += "<#assign text = text?replace('Ḓ','D')>\n";
      str += "<#assign text = text?replace('Ḋ','D')>\n";
      str += "<#assign text = text?replace('Ḍ','D')>\n";
      str += "<#assign text = text?replace('Ɗ','D')>\n";
      str += "<#assign text = text?replace('Ḏ','D')>\n";
      str += "<#assign text = text?replace('ǲ','D')>\n";
      str += "<#assign text = text?replace('ǅ','D')>\n";
      str += "<#assign text = text?replace('Đ','D')>\n";
      str += "<#assign text = text?replace('Ƌ','D')>\n";
      str += "<#assign text = text?replace('Ǳ','DZ')>\n";
      str += "<#assign text = text?replace('Ǆ','DZ')>\n";
      str += "<#assign text = text?replace('É','E')>\n";
      str += "<#assign text = text?replace('Ĕ','E')>\n";
      str += "<#assign text = text?replace('Ě','E')>\n";
      str += "<#assign text = text?replace('Ȩ','E')>\n";
      str += "<#assign text = text?replace('Ḝ','E')>\n";
      str += "<#assign text = text?replace('Ê','E')>\n";
      str += "<#assign text = text?replace('Ế','E')>\n";
      str += "<#assign text = text?replace('Ệ','E')>\n";
      str += "<#assign text = text?replace('Ề','E')>\n";
      str += "<#assign text = text?replace('Ể','E')>\n";
      str += "<#assign text = text?replace('Ễ','E')>\n";
      str += "<#assign text = text?replace('Ḙ','E')>\n";
      str += "<#assign text = text?replace('Ë','E')>\n";
      str += "<#assign text = text?replace('Ė','E')>\n";
      str += "<#assign text = text?replace('Ẹ','E')>\n";
      str += "<#assign text = text?replace('Ȅ','E')>\n";
      str += "<#assign text = text?replace('È','E')>\n";
      str += "<#assign text = text?replace('Ẻ','E')>\n";
      str += "<#assign text = text?replace('Ȇ','E')>\n";
      str += "<#assign text = text?replace('Ē','E')>\n";
      str += "<#assign text = text?replace('Ḗ','E')>\n";
      str += "<#assign text = text?replace('Ḕ','E')>\n";
      str += "<#assign text = text?replace('Ę','E')>\n";
      str += "<#assign text = text?replace('Ɇ','E')>\n";
      str += "<#assign text = text?replace('Ẽ','E')>\n";
      str += "<#assign text = text?replace('Ḛ','E')>\n";
      str += "<#assign text = text?replace('Ḟ','F')>\n";
      str += "<#assign text = text?replace('Ƒ','F')>\n";
      str += "<#assign text = text?replace('Ǵ','G')>\n";
      str += "<#assign text = text?replace('Ğ','G')>\n";
      str += "<#assign text = text?replace('Ǧ','G')>\n";
      str += "<#assign text = text?replace('Ģ','G')>\n";
      str += "<#assign text = text?replace('Ĝ','G')>\n";
      str += "<#assign text = text?replace('Ġ','G')>\n";
      str += "<#assign text = text?replace('Ɠ','G')>\n";
      str += "<#assign text = text?replace('Ḡ','G')>\n";
      str += "<#assign text = text?replace('Ǥ','G')>\n";
      str += "<#assign text = text?replace('Ḫ','H')>\n";
      str += "<#assign text = text?replace('Ȟ','H')>\n";
      str += "<#assign text = text?replace('Ḩ','H')>\n";
      str += "<#assign text = text?replace('Ĥ','H')>\n";
      str += "<#assign text = text?replace('Ⱨ','H')>\n";
      str += "<#assign text = text?replace('Ḧ','H')>\n";
      str += "<#assign text = text?replace('Ḣ','H')>\n";
      str += "<#assign text = text?replace('Ḥ','H')>\n";
      str += "<#assign text = text?replace('Ħ','H')>\n";
      str += "<#assign text = text?replace('Í','I')>\n";
      str += "<#assign text = text?replace('Ĭ','I')>\n";
      str += "<#assign text = text?replace('Ǐ','I')>\n";
      str += "<#assign text = text?replace('Î','I')>\n";
      str += "<#assign text = text?replace('Ï','I')>\n";
      str += "<#assign text = text?replace('Ḯ','I')>\n";
      str += "<#assign text = text?replace('İ','I')>\n";
      str += "<#assign text = text?replace('Ị','I')>\n";
      str += "<#assign text = text?replace('Ȉ','I')>\n";
      str += "<#assign text = text?replace('Ì','I')>\n";
      str += "<#assign text = text?replace('Ỉ','I')>\n";
      str += "<#assign text = text?replace('Ȋ','I')>\n";
      str += "<#assign text = text?replace('Ī','I')>\n";
      str += "<#assign text = text?replace('Į','I')>\n";
      str += "<#assign text = text?replace('Ɨ','I')>\n";
      str += "<#assign text = text?replace('Ĩ','I')>\n";
      str += "<#assign text = text?replace('Ḭ','I')>\n";
      str += "<#assign text = text?replace('Ĵ','J')>\n";
      str += "<#assign text = text?replace('Ɉ','J')>\n";
      str += "<#assign text = text?replace('Ḱ','K')>\n";
      str += "<#assign text = text?replace('Ǩ','K')>\n";
      str += "<#assign text = text?replace('Ķ','K')>\n";
      str += "<#assign text = text?replace('Ⱪ','K')>\n";
      str += "<#assign text = text?replace('Ḳ','K')>\n";
      str += "<#assign text = text?replace('Ƙ','K')>\n";
      str += "<#assign text = text?replace('Ḵ','K')>\n";
      str += "<#assign text = text?replace('Ĺ','L')>\n";
      str += "<#assign text = text?replace('Ƚ','L')>\n";
      str += "<#assign text = text?replace('Ľ','L')>\n";
      str += "<#assign text = text?replace('Ļ','L')>\n";
      str += "<#assign text = text?replace('Ḽ','L')>\n";
      str += "<#assign text = text?replace('Ḷ','L')>\n";
      str += "<#assign text = text?replace('Ḹ','L')>\n";
      str += "<#assign text = text?replace('Ⱡ','L')>\n";
      str += "<#assign text = text?replace('Ḻ','L')>\n";
      str += "<#assign text = text?replace('Ŀ','L')>\n";
      str += "<#assign text = text?replace('Ɫ','L')>\n";
      str += "<#assign text = text?replace('ǈ','L')>\n";
      str += "<#assign text = text?replace('Ł','L')>\n";
      str += "<#assign text = text?replace('Ǉ','LJ')>\n";
      str += "<#assign text = text?replace('Ḿ','M')>\n";
      str += "<#assign text = text?replace('Ṁ','M')>\n";
      str += "<#assign text = text?replace('Ṃ','M')>\n";
      str += "<#assign text = text?replace('Ń','N')>\n";
      str += "<#assign text = text?replace('Ň','N')>\n";
      str += "<#assign text = text?replace('Ņ','N')>\n";
      str += "<#assign text = text?replace('Ṋ','N')>\n";
      str += "<#assign text = text?replace('Ṅ','N')>\n";
      str += "<#assign text = text?replace('Ṇ','N')>\n";
      str += "<#assign text = text?replace('Ǹ','N')>\n";
      str += "<#assign text = text?replace('Ɲ','N')>\n";
      str += "<#assign text = text?replace('Ṉ','N')>\n";
      str += "<#assign text = text?replace('Ƞ','N')>\n";
      str += "<#assign text = text?replace('ǋ','N')>\n";
      str += "<#assign text = text?replace('Ñ','N')>\n";
      str += "<#assign text = text?replace('Ǌ','NJ')>\n";
      str += "<#assign text = text?replace('Ó','O')>\n";
      str += "<#assign text = text?replace('Ŏ','O')>\n";
      str += "<#assign text = text?replace('Ǒ','O')>\n";
      str += "<#assign text = text?replace('Ô','O')>\n";
      str += "<#assign text = text?replace('Ố','O')>\n";
      str += "<#assign text = text?replace('Ộ','O')>\n";
      str += "<#assign text = text?replace('Ồ','O')>\n";
      str += "<#assign text = text?replace('Ổ','O')>\n";
      str += "<#assign text = text?replace('Ỗ','O')>\n";
      str += "<#assign text = text?replace('Ö','O')>\n";
      str += "<#assign text = text?replace('Ȫ','O')>\n";
      str += "<#assign text = text?replace('Ȯ','O')>\n";
      str += "<#assign text = text?replace('Ȱ','O')>\n";
      str += "<#assign text = text?replace('Ọ','O')>\n";
      str += "<#assign text = text?replace('Ő','O')>\n";
      str += "<#assign text = text?replace('Ȍ','O')>\n";
      str += "<#assign text = text?replace('Ò','O')>\n";
      str += "<#assign text = text?replace('Ỏ','O')>\n";
      str += "<#assign text = text?replace('Ơ','O')>\n";
      str += "<#assign text = text?replace('Ớ','O')>\n";
      str += "<#assign text = text?replace('Ợ','O')>\n";
      str += "<#assign text = text?replace('Ờ','O')>\n";
      str += "<#assign text = text?replace('Ở','O')>\n";
      str += "<#assign text = text?replace('Ỡ','O')>\n";
      str += "<#assign text = text?replace('Ȏ','O')>\n";
      str += "<#assign text = text?replace('Ō','O')>\n";
      str += "<#assign text = text?replace('Ṓ','O')>\n";
      str += "<#assign text = text?replace('Ṑ','O')>\n";
      str += "<#assign text = text?replace('Ɵ','O')>\n";
      str += "<#assign text = text?replace('Ǫ','O')>\n";
      str += "<#assign text = text?replace('Ǭ','O')>\n";
      str += "<#assign text = text?replace('Ø','O')>\n";
      str += "<#assign text = text?replace('Ǿ','O')>\n";
      str += "<#assign text = text?replace('Õ','O')>\n";
      str += "<#assign text = text?replace('Ṍ','O')>\n";
      str += "<#assign text = text?replace('Ṏ','O')>\n";
      str += "<#assign text = text?replace('Ȭ','O')>\n";
      str += "<#assign text = text?replace('Ƣ','OI')>\n";
      str += "<#assign text = text?replace('Ɛ','E')>\n";
      str += "<#assign text = text?replace('Ɔ','O')>\n";
      str += "<#assign text = text?replace('Ȣ','OU')>\n";
      str += "<#assign text = text?replace('Ṕ','P')>\n";
      str += "<#assign text = text?replace('Ṗ','P')>\n";
      str += "<#assign text = text?replace('Ƥ','P')>\n";
      str += "<#assign text = text?replace('Ᵽ','P')>\n";
      str += "<#assign text = text?replace('Ŕ','R')>\n";
      str += "<#assign text = text?replace('Ř','R')>\n";
      str += "<#assign text = text?replace('Ŗ','R')>\n";
      str += "<#assign text = text?replace('Ṙ','R')>\n";
      str += "<#assign text = text?replace('Ṛ','R')>\n";
      str += "<#assign text = text?replace('Ṝ','R')>\n";
      str += "<#assign text = text?replace('Ȑ','R')>\n";
      str += "<#assign text = text?replace('Ȓ','R')>\n";
      str += "<#assign text = text?replace('Ṟ','R')>\n";
      str += "<#assign text = text?replace('Ɍ','R')>\n";
      str += "<#assign text = text?replace('Ɽ','R')>\n";
      str += "<#assign text = text?replace('Ǝ','E')>\n";
      str += "<#assign text = text?replace('Ś','S')>\n";
      str += "<#assign text = text?replace('Ṥ','S')>\n";
      str += "<#assign text = text?replace('Š','S')>\n";
      str += "<#assign text = text?replace('Ṧ','S')>\n";
      str += "<#assign text = text?replace('Ş','S')>\n";
      str += "<#assign text = text?replace('Ŝ','S')>\n";
      str += "<#assign text = text?replace('Ș','S')>\n";
      str += "<#assign text = text?replace('Ṡ','S')>\n";
      str += "<#assign text = text?replace('Ṣ','S')>\n";
      str += "<#assign text = text?replace('Ṩ','S')>\n";
      str += "<#assign text = text?replace('ẞ','SS')>\n";
      str += "<#assign text = text?replace('Ť','T')>\n";
      str += "<#assign text = text?replace('Ţ','T')>\n";
      str += "<#assign text = text?replace('Ṱ','T')>\n";
      str += "<#assign text = text?replace('Ț','T')>\n";
      str += "<#assign text = text?replace('Ⱦ','T')>\n";
      str += "<#assign text = text?replace('Ṫ','T')>\n";
      str += "<#assign text = text?replace('Ṭ','T')>\n";
      str += "<#assign text = text?replace('Ƭ','T')>\n";
      str += "<#assign text = text?replace('Ṯ','T')>\n";
      str += "<#assign text = text?replace('Ʈ','T')>\n";
      str += "<#assign text = text?replace('Ŧ','T')>\n";
      str += "<#assign text = text?replace('Ɯ','M')>\n";
      str += "<#assign text = text?replace('Ʌ','V')>\n";
      str += "<#assign text = text?replace('Ú','U')>\n";
      str += "<#assign text = text?replace('Ŭ','U')>\n";
      str += "<#assign text = text?replace('Ǔ','U')>\n";
      str += "<#assign text = text?replace('Û','U')>\n";
      str += "<#assign text = text?replace('Ṷ','U')>\n";
      str += "<#assign text = text?replace('Ü','U')>\n";
      str += "<#assign text = text?replace('Ǘ','U')>\n";
      str += "<#assign text = text?replace('Ǚ','U')>\n";
      str += "<#assign text = text?replace('Ǜ','U')>\n";
      str += "<#assign text = text?replace('Ǖ','U')>\n";
      str += "<#assign text = text?replace('Ṳ','U')>\n";
      str += "<#assign text = text?replace('Ụ','U')>\n";
      str += "<#assign text = text?replace('Ű','U')>\n";
      str += "<#assign text = text?replace('Ȕ','U')>\n";
      str += "<#assign text = text?replace('Ù','U')>\n";
      str += "<#assign text = text?replace('Ủ','U')>\n";
      str += "<#assign text = text?replace('Ư','U')>\n";
      str += "<#assign text = text?replace('Ứ','U')>\n";
      str += "<#assign text = text?replace('Ự','U')>\n";
      str += "<#assign text = text?replace('Ừ','U')>\n";
      str += "<#assign text = text?replace('Ử','U')>\n";
      str += "<#assign text = text?replace('Ữ','U')>\n";
      str += "<#assign text = text?replace('Ȗ','U')>\n";
      str += "<#assign text = text?replace('Ū','U')>\n";
      str += "<#assign text = text?replace('Ṻ','U')>\n";
      str += "<#assign text = text?replace('Ų','U')>\n";
      str += "<#assign text = text?replace('Ů','U')>\n";
      str += "<#assign text = text?replace('Ũ','U')>\n";
      str += "<#assign text = text?replace('Ṹ','U')>\n";
      str += "<#assign text = text?replace('Ṵ','U')>\n";
      str += "<#assign text = text?replace('Ṿ','V')>\n";
      str += "<#assign text = text?replace('Ʋ','V')>\n";
      str += "<#assign text = text?replace('Ṽ','V')>\n";
      str += "<#assign text = text?replace('Ẃ','W')>\n";
      str += "<#assign text = text?replace('Ŵ','W')>\n";
      str += "<#assign text = text?replace('Ẅ','W')>\n";
      str += "<#assign text = text?replace('Ẇ','W')>\n";
      str += "<#assign text = text?replace('Ẉ','W')>\n";
      str += "<#assign text = text?replace('Ẁ','W')>\n";
      str += "<#assign text = text?replace('Ⱳ','W')>\n";
      str += "<#assign text = text?replace('Ẍ','X')>\n";
      str += "<#assign text = text?replace('Ẋ','X')>\n";
      str += "<#assign text = text?replace('Ý','Y')>\n";
      str += "<#assign text = text?replace('Ŷ','Y')>\n";
      str += "<#assign text = text?replace('Ÿ','Y')>\n";
      str += "<#assign text = text?replace('Ẏ','Y')>\n";
      str += "<#assign text = text?replace('Ỵ','Y')>\n";
      str += "<#assign text = text?replace('Ỳ','Y')>\n";
      str += "<#assign text = text?replace('Ƴ','Y')>\n";
      str += "<#assign text = text?replace('Ỷ','Y')>\n";
      str += "<#assign text = text?replace('Ȳ','Y')>\n";
      str += "<#assign text = text?replace('Ɏ','Y')>\n";
      str += "<#assign text = text?replace('Ỹ','Y')>\n";
      str += "<#assign text = text?replace('Ź','Z')>\n";
      str += "<#assign text = text?replace('Ž','Z')>\n";
      str += "<#assign text = text?replace('Ẑ','Z')>\n";
      str += "<#assign text = text?replace('Ⱬ','Z')>\n";
      str += "<#assign text = text?replace('Ż','Z')>\n";
      str += "<#assign text = text?replace('Ẓ','Z')>\n";
      str += "<#assign text = text?replace('Ȥ','Z')>\n";
      str += "<#assign text = text?replace('Ẕ','Z')>\n";
      str += "<#assign text = text?replace('Ƶ','Z')>\n";
      str += "<#assign text = text?replace('Ĳ','IJ')>\n";
      str += "<#assign text = text?replace('Œ','OE')>\n";
      str += "<#assign text = text?replace('ᴀ','A')>\n";
      str += "<#assign text = text?replace('ᴁ','AE')>\n";
      str += "<#assign text = text?replace('ʙ','B')>\n";
      str += "<#assign text = text?replace('ᴃ','B')>\n";
      str += "<#assign text = text?replace('ᴄ','C')>\n";
      str += "<#assign text = text?replace('ᴅ','D')>\n";
      str += "<#assign text = text?replace('ᴇ','E')>\n";
      str += "<#assign text = text?replace('ɢ','G')>\n";
      str += "<#assign text = text?replace('ʛ','G')>\n";
      str += "<#assign text = text?replace('ʜ','H')>\n";
      str += "<#assign text = text?replace('ɪ','I')>\n";
      str += "<#assign text = text?replace('ʁ','R')>\n";
      str += "<#assign text = text?replace('ᴊ','J')>\n";
      str += "<#assign text = text?replace('ᴋ','K')>\n";
      str += "<#assign text = text?replace('ʟ','L')>\n";
      str += "<#assign text = text?replace('ᴌ','L')>\n";
      str += "<#assign text = text?replace('ᴍ','M')>\n";
      str += "<#assign text = text?replace('ɴ','N')>\n";
      str += "<#assign text = text?replace('ᴏ','O')>\n";
      str += "<#assign text = text?replace('ɶ','OE')>\n";
      str += "<#assign text = text?replace('ᴐ','O')>\n";
      str += "<#assign text = text?replace('ᴕ','OU')>\n";
      str += "<#assign text = text?replace('ᴘ','P')>\n";
      str += "<#assign text = text?replace('ʀ','R')>\n";
      str += "<#assign text = text?replace('ᴎ','N')>\n";
      str += "<#assign text = text?replace('ᴙ','R')>\n";
      str += "<#assign text = text?replace('ᴛ','T')>\n";
      str += "<#assign text = text?replace('ᴚ','R')>\n";
      str += "<#assign text = text?replace('ᴜ','U')>\n";
      str += "<#assign text = text?replace('ᴠ','V')>\n";
      str += "<#assign text = text?replace('ᴡ','W')>\n";
      str += "<#assign text = text?replace('ʏ','Y')>\n";
      str += "<#assign text = text?replace('ᴢ','Z')>\n";
      str += "<#assign text = text?replace('á','a')>\n";
      str += "<#assign text = text?replace('ă','a')>\n";
      str += "<#assign text = text?replace('ắ','a')>\n";
      str += "<#assign text = text?replace('ặ','a')>\n";
      str += "<#assign text = text?replace('ằ','a')>\n";
      str += "<#assign text = text?replace('ẳ','a')>\n";
      str += "<#assign text = text?replace('ẵ','a')>\n";
      str += "<#assign text = text?replace('ǎ','a')>\n";
      str += "<#assign text = text?replace('â','a')>\n";
      str += "<#assign text = text?replace('ấ','a')>\n";
      str += "<#assign text = text?replace('ậ','a')>\n";
      str += "<#assign text = text?replace('ầ','a')>\n";
      str += "<#assign text = text?replace('ẩ','a')>\n";
      str += "<#assign text = text?replace('ẫ','a')>\n";
      str += "<#assign text = text?replace('ä','a')>\n";
      str += "<#assign text = text?replace('ǟ','a')>\n";
      str += "<#assign text = text?replace('ȧ','a')>\n";
      str += "<#assign text = text?replace('ǡ','a')>\n";
      str += "<#assign text = text?replace('ạ','a')>\n";
      str += "<#assign text = text?replace('ȁ','a')>\n";
      str += "<#assign text = text?replace('à','a')>\n";
      str += "<#assign text = text?replace('ả','a')>\n";
      str += "<#assign text = text?replace('ȃ','a')>\n";
      str += "<#assign text = text?replace('ā','a')>\n";
      str += "<#assign text = text?replace('ą','a')>\n";
      str += "<#assign text = text?replace('ᶏ','a')>\n";
      str += "<#assign text = text?replace('ẚ','a')>\n";
      str += "<#assign text = text?replace('å','a')>\n";
      str += "<#assign text = text?replace('ǻ','a')>\n";
      str += "<#assign text = text?replace('ḁ','a')>\n";
      str += "<#assign text = text?replace('ⱥ','a')>\n";
      str += "<#assign text = text?replace('ã','a')>\n";
      str += "<#assign text = text?replace('æ','ae')>\n";
      str += "<#assign text = text?replace('ǽ','ae')>\n";
      str += "<#assign text = text?replace('ǣ','ae')>\n";
      str += "<#assign text = text?replace('ḃ','b')>\n";
      str += "<#assign text = text?replace('ḅ','b')>\n";
      str += "<#assign text = text?replace('ɓ','b')>\n";
      str += "<#assign text = text?replace('ḇ','b')>\n";
      str += "<#assign text = text?replace('ᵬ','b')>\n";
      str += "<#assign text = text?replace('ᶀ','b')>\n";
      str += "<#assign text = text?replace('ƀ','b')>\n";
      str += "<#assign text = text?replace('ƃ','b')>\n";
      str += "<#assign text = text?replace('ɵ','o')>\n";
      str += "<#assign text = text?replace('ć','c')>\n";
      str += "<#assign text = text?replace('č','c')>\n";
      str += "<#assign text = text?replace('ç','c')>\n";
      str += "<#assign text = text?replace('ḉ','c')>\n";
      str += "<#assign text = text?replace('ĉ','c')>\n";
      str += "<#assign text = text?replace('ɕ','c')>\n";
      str += "<#assign text = text?replace('ċ','c')>\n";
      str += "<#assign text = text?replace('ƈ','c')>\n";
      str += "<#assign text = text?replace('ȼ','c')>\n";
      str += "<#assign text = text?replace('ď','d')>\n";
      str += "<#assign text = text?replace('ḑ','d')>\n";
      str += "<#assign text = text?replace('ḓ','d')>\n";
      str += "<#assign text = text?replace('ȡ','d')>\n";
      str += "<#assign text = text?replace('ḋ','d')>\n";
      str += "<#assign text = text?replace('ḍ','d')>\n";
      str += "<#assign text = text?replace('ɗ','d')>\n";
      str += "<#assign text = text?replace('ᶑ','d')>\n";
      str += "<#assign text = text?replace('ḏ','d')>\n";
      str += "<#assign text = text?replace('ᵭ','d')>\n";
      str += "<#assign text = text?replace('ᶁ','d')>\n";
      str += "<#assign text = text?replace('đ','d')>\n";
      str += "<#assign text = text?replace('ɖ','d')>\n";
      str += "<#assign text = text?replace('ƌ','d')>\n";
      str += "<#assign text = text?replace('ı','i')>\n";
      str += "<#assign text = text?replace('ɟ','j')>\n";
      str += "<#assign text = text?replace('ʄ','j')>\n";
      str += "<#assign text = text?replace('ǳ','dz')>\n";
      str += "<#assign text = text?replace('ǆ','dz')>\n";
      str += "<#assign text = text?replace('é','e')>\n";
      str += "<#assign text = text?replace('ĕ','e')>\n";
      str += "<#assign text = text?replace('ě','e')>\n";
      str += "<#assign text = text?replace('ȩ','e')>\n";
      str += "<#assign text = text?replace('ḝ','e')>\n";
      str += "<#assign text = text?replace('ê','e')>\n";
      str += "<#assign text = text?replace('ế','e')>\n";
      str += "<#assign text = text?replace('ệ','e')>\n";
      str += "<#assign text = text?replace('ề','e')>\n";
      str += "<#assign text = text?replace('ể','e')>\n";
      str += "<#assign text = text?replace('ễ','e')>\n";
      str += "<#assign text = text?replace('ḙ','e')>\n";
      str += "<#assign text = text?replace('ë','e')>\n";
      str += "<#assign text = text?replace('ė','e')>\n";
      str += "<#assign text = text?replace('ẹ','e')>\n";
      str += "<#assign text = text?replace('ȅ','e')>\n";
      str += "<#assign text = text?replace('è','e')>\n";
      str += "<#assign text = text?replace('ẻ','e')>\n";
      str += "<#assign text = text?replace('ȇ','e')>\n";
      str += "<#assign text = text?replace('ē','e')>\n";
      str += "<#assign text = text?replace('ḗ','e')>\n";
      str += "<#assign text = text?replace('ḕ','e')>\n";
      str += "<#assign text = text?replace('ę','e')>\n";
      str += "<#assign text = text?replace('ᶒ','e')>\n";
      str += "<#assign text = text?replace('ɇ','e')>\n";
      str += "<#assign text = text?replace('ẽ','e')>\n";
      str += "<#assign text = text?replace('ḛ','e')>\n";
      str += "<#assign text = text?replace('ḟ','f')>\n";
      str += "<#assign text = text?replace('ƒ','f')>\n";
      str += "<#assign text = text?replace('ᵮ','f')>\n";
      str += "<#assign text = text?replace('ᶂ','f')>\n";
      str += "<#assign text = text?replace('ǵ','g')>\n";
      str += "<#assign text = text?replace('ğ','g')>\n";
      str += "<#assign text = text?replace('ǧ','g')>\n";
      str += "<#assign text = text?replace('ģ','g')>\n";
      str += "<#assign text = text?replace('ĝ','g')>\n";
      str += "<#assign text = text?replace('ġ','g')>\n";
      str += "<#assign text = text?replace('ɠ','g')>\n";
      str += "<#assign text = text?replace('ḡ','g')>\n";
      str += "<#assign text = text?replace('ᶃ','g')>\n";
      str += "<#assign text = text?replace('ǥ','g')>\n";
      str += "<#assign text = text?replace('ḫ','h')>\n";
      str += "<#assign text = text?replace('ȟ','h')>\n";
      str += "<#assign text = text?replace('ḩ','h')>\n";
      str += "<#assign text = text?replace('ĥ','h')>\n";
      str += "<#assign text = text?replace('ⱨ','h')>\n";
      str += "<#assign text = text?replace('ḧ','h')>\n";
      str += "<#assign text = text?replace('ḣ','h')>\n";
      str += "<#assign text = text?replace('ḥ','h')>\n";
      str += "<#assign text = text?replace('ɦ','h')>\n";
      str += "<#assign text = text?replace('ħ','h')>\n";
      str += "<#assign text = text?replace('ƕ','hv')>\n";
      str += "<#assign text = text?replace('í','i')>\n";
      str += "<#assign text = text?replace('ĭ','i')>\n";
      str += "<#assign text = text?replace('ǐ','i')>\n";
      str += "<#assign text = text?replace('î','i')>\n";
      str += "<#assign text = text?replace('ï','i')>\n";
      str += "<#assign text = text?replace('ḯ','i')>\n";
      str += "<#assign text = text?replace('ị','i')>\n";
      str += "<#assign text = text?replace('ȉ','i')>\n";
      str += "<#assign text = text?replace('ì','i')>\n";
      str += "<#assign text = text?replace('ỉ','i')>\n";
      str += "<#assign text = text?replace('ȋ','i')>\n";
      str += "<#assign text = text?replace('ī','i')>\n";
      str += "<#assign text = text?replace('į','i')>\n";
      str += "<#assign text = text?replace('ᶖ','i')>\n";
      str += "<#assign text = text?replace('ɨ','i')>\n";
      str += "<#assign text = text?replace('ĩ','i')>\n";
      str += "<#assign text = text?replace('ḭ','i')>\n";
      str += "<#assign text = text?replace('ᵹ','g')>\n";
      str += "<#assign text = text?replace('ǰ','j')>\n";
      str += "<#assign text = text?replace('ĵ','j')>\n";
      str += "<#assign text = text?replace('ʝ','j')>\n";
      str += "<#assign text = text?replace('ɉ','j')>\n";
      str += "<#assign text = text?replace('ḱ','k')>\n";
      str += "<#assign text = text?replace('ǩ','k')>\n";
      str += "<#assign text = text?replace('ķ','k')>\n";
      str += "<#assign text = text?replace('ⱪ','k')>\n";
      str += "<#assign text = text?replace('ḳ','k')>\n";
      str += "<#assign text = text?replace('ƙ','k')>\n";
      str += "<#assign text = text?replace('ḵ','k')>\n";
      str += "<#assign text = text?replace('ᶄ','k')>\n";
      str += "<#assign text = text?replace('ĺ','l')>\n";
      str += "<#assign text = text?replace('ƚ','l')>\n";
      str += "<#assign text = text?replace('ɬ','l')>\n";
      str += "<#assign text = text?replace('ľ','l')>\n";
      str += "<#assign text = text?replace('ļ','l')>\n";
      str += "<#assign text = text?replace('ḽ','l')>\n";
      str += "<#assign text = text?replace('ȴ','l')>\n";
      str += "<#assign text = text?replace('ḷ','l')>\n";
      str += "<#assign text = text?replace('ḹ','l')>\n";
      str += "<#assign text = text?replace('ⱡ','l')>\n";
      str += "<#assign text = text?replace('ḻ','l')>\n";
      str += "<#assign text = text?replace('ŀ','l')>\n";
      str += "<#assign text = text?replace('ɫ','l')>\n";
      str += "<#assign text = text?replace('ᶅ','l')>\n";
      str += "<#assign text = text?replace('ɭ','l')>\n";
      str += "<#assign text = text?replace('ł','l')>\n";
      str += "<#assign text = text?replace('ǉ','lj')>\n";
      str += "<#assign text = text?replace('ſ','s')>\n";
      str += "<#assign text = text?replace('ẛ','s')>\n";
      str += "<#assign text = text?replace('ḿ','m')>\n";
      str += "<#assign text = text?replace('ṁ','m')>\n";
      str += "<#assign text = text?replace('ṃ','m')>\n";
      str += "<#assign text = text?replace('ɱ','m')>\n";
      str += "<#assign text = text?replace('ᵯ','m')>\n";
      str += "<#assign text = text?replace('ᶆ','m')>\n";
      str += "<#assign text = text?replace('ń','n')>\n";
      str += "<#assign text = text?replace('ň','n')>\n";
      str += "<#assign text = text?replace('ņ','n')>\n";
      str += "<#assign text = text?replace('ṋ','n')>\n";
      str += "<#assign text = text?replace('ȵ','n')>\n";
      str += "<#assign text = text?replace('ṅ','n')>\n";
      str += "<#assign text = text?replace('ṇ','n')>\n";
      str += "<#assign text = text?replace('ǹ','n')>\n";
      str += "<#assign text = text?replace('ɲ','n')>\n";
      str += "<#assign text = text?replace('ṉ','n')>\n";
      str += "<#assign text = text?replace('ƞ','n')>\n";
      str += "<#assign text = text?replace('ᵰ','n')>\n";
      str += "<#assign text = text?replace('ᶇ','n')>\n";
      str += "<#assign text = text?replace('ɳ','n')>\n";
      str += "<#assign text = text?replace('ñ','n')>\n";
      str += "<#assign text = text?replace('ǌ','nj')>\n";
      str += "<#assign text = text?replace('ó','o')>\n";
      str += "<#assign text = text?replace('ŏ','o')>\n";
      str += "<#assign text = text?replace('ǒ','o')>\n";
      str += "<#assign text = text?replace('ô','o')>\n";
      str += "<#assign text = text?replace('ố','o')>\n";
      str += "<#assign text = text?replace('ộ','o')>\n";
      str += "<#assign text = text?replace('ồ','o')>\n";
      str += "<#assign text = text?replace('ổ','o')>\n";
      str += "<#assign text = text?replace('ỗ','o')>\n";
      str += "<#assign text = text?replace('ö','o')>\n";
      str += "<#assign text = text?replace('ȫ','o')>\n";
      str += "<#assign text = text?replace('ȯ','o')>\n";
      str += "<#assign text = text?replace('ȱ','o')>\n";
      str += "<#assign text = text?replace('ọ','o')>\n";
      str += "<#assign text = text?replace('ő','o')>\n";
      str += "<#assign text = text?replace('ȍ','o')>\n";
      str += "<#assign text = text?replace('ò','o')>\n";
      str += "<#assign text = text?replace('ỏ','o')>\n";
      str += "<#assign text = text?replace('ơ','o')>\n";
      str += "<#assign text = text?replace('ớ','o')>\n";
      str += "<#assign text = text?replace('ợ','o')>\n";
      str += "<#assign text = text?replace('ờ','o')>\n";
      str += "<#assign text = text?replace('ở','o')>\n";
      str += "<#assign text = text?replace('ỡ','o')>\n";
      str += "<#assign text = text?replace('ȏ','o')>\n";
      str += "<#assign text = text?replace('ō','o')>\n";
      str += "<#assign text = text?replace('ṓ','o')>\n";
      str += "<#assign text = text?replace('ṑ','o')>\n";
      str += "<#assign text = text?replace('ǫ','o')>\n";
      str += "<#assign text = text?replace('ǭ','o')>\n";
      str += "<#assign text = text?replace('ø','o')>\n";
      str += "<#assign text = text?replace('ǿ','o')>\n";
      str += "<#assign text = text?replace('õ','o')>\n";
      str += "<#assign text = text?replace('ṍ','o')>\n";
      str += "<#assign text = text?replace('ṏ','o')>\n";
      str += "<#assign text = text?replace('ȭ','o')>\n";
      str += "<#assign text = text?replace('ƣ','oi')>\n";
      str += "<#assign text = text?replace('ɛ','e')>\n";
      str += "<#assign text = text?replace('ᶓ','e')>\n";
      str += "<#assign text = text?replace('ɔ','o')>\n";
      str += "<#assign text = text?replace('ᶗ','o')>\n";
      str += "<#assign text = text?replace('ȣ','ou')>\n";
      str += "<#assign text = text?replace('ṕ','p')>\n";
      str += "<#assign text = text?replace('ṗ','p')>\n";
      str += "<#assign text = text?replace('ƥ','p')>\n";
      str += "<#assign text = text?replace('ᵱ','p')>\n";
      str += "<#assign text = text?replace('ᶈ','p')>\n";
      str += "<#assign text = text?replace('ᵽ','p')>\n";
      str += "<#assign text = text?replace('ʠ','q')>\n";
      str += "<#assign text = text?replace('ɋ','q')>\n";
      str += "<#assign text = text?replace('ŕ','r')>\n";
      str += "<#assign text = text?replace('ř','r')>\n";
      str += "<#assign text = text?replace('ŗ','r')>\n";
      str += "<#assign text = text?replace('ṙ','r')>\n";
      str += "<#assign text = text?replace('ṛ','r')>\n";
      str += "<#assign text = text?replace('ṝ','r')>\n";
      str += "<#assign text = text?replace('ȑ','r')>\n";
      str += "<#assign text = text?replace('ɾ','r')>\n";
      str += "<#assign text = text?replace('ᵳ','r')>\n";
      str += "<#assign text = text?replace('ȓ','r')>\n";
      str += "<#assign text = text?replace('ṟ','r')>\n";
      str += "<#assign text = text?replace('ɼ','r')>\n";
      str += "<#assign text = text?replace('ᵲ','r')>\n";
      str += "<#assign text = text?replace('ᶉ','r')>\n";
      str += "<#assign text = text?replace('ɍ','r')>\n";
      str += "<#assign text = text?replace('ɽ','r')>\n";
      str += "<#assign text = text?replace('ↄ','c')>\n";
      str += "<#assign text = text?replace('ɘ','e')>\n";
      str += "<#assign text = text?replace('ɿ','r')>\n";
      str += "<#assign text = text?replace('ś','s')>\n";
      str += "<#assign text = text?replace('ṥ','s')>\n";
      str += "<#assign text = text?replace('š','s')>\n";
      str += "<#assign text = text?replace('ṧ','s')>\n";
      str += "<#assign text = text?replace('ş','s')>\n";
      str += "<#assign text = text?replace('ŝ','s')>\n";
      str += "<#assign text = text?replace('ș','s')>\n";
      str += "<#assign text = text?replace('ṡ','s')>\n";
      str += "<#assign text = text?replace('ṣ','s')>\n";
      str += "<#assign text = text?replace('ṩ','s')>\n";
      str += "<#assign text = text?replace('ʂ','s')>\n";
      str += "<#assign text = text?replace('ᵴ','s')>\n";
      str += "<#assign text = text?replace('ᶊ','s')>\n";
      str += "<#assign text = text?replace('ȿ','s')>\n";
      str += "<#assign text = text?replace('ɡ','g')>\n";
      str += "<#assign text = text?replace('ß','ss')>\n";
      str += "<#assign text = text?replace('ᴑ','o')>\n";
      str += "<#assign text = text?replace('ᴓ','o')>\n";
      str += "<#assign text = text?replace('ᴝ','u')>\n";
      str += "<#assign text = text?replace('ť','t')>\n";
      str += "<#assign text = text?replace('ţ','t')>\n";
      str += "<#assign text = text?replace('ṱ','t')>\n";
      str += "<#assign text = text?replace('ț','t')>\n";
      str += "<#assign text = text?replace('ȶ','t')>\n";
      str += "<#assign text = text?replace('ẗ','t')>\n";
      str += "<#assign text = text?replace('ⱦ','t')>\n";
      str += "<#assign text = text?replace('ṫ','t')>\n";
      str += "<#assign text = text?replace('ṭ','t')>\n";
      str += "<#assign text = text?replace('ƭ','t')>\n";
      str += "<#assign text = text?replace('ṯ','t')>\n";
      str += "<#assign text = text?replace('ᵵ','t')>\n";
      str += "<#assign text = text?replace('ƫ','t')>\n";
      str += "<#assign text = text?replace('ʈ','t')>\n";
      str += "<#assign text = text?replace('ŧ','t')>\n";
      str += "<#assign text = text?replace('ᵺ','th')>\n";
      str += "<#assign text = text?replace('ɐ','a')>\n";
      str += "<#assign text = text?replace('ᴂ','ae')>\n";
      str += "<#assign text = text?replace('ǝ','e')>\n";
      str += "<#assign text = text?replace('ᵷ','g')>\n";
      str += "<#assign text = text?replace('ɥ','h')>\n";
      str += "<#assign text = text?replace('ʮ','h')>\n";
      str += "<#assign text = text?replace('ʯ','h')>\n";
      str += "<#assign text = text?replace('ᴉ','i')>\n";
      str += "<#assign text = text?replace('ʞ','k')>\n";
      str += "<#assign text = text?replace('ɯ','m')>\n";
      str += "<#assign text = text?replace('ɰ','m')>\n";
      str += "<#assign text = text?replace('ᴔ','oe')>\n";
      str += "<#assign text = text?replace('ɹ','r')>\n";
      str += "<#assign text = text?replace('ɻ','r')>\n";
      str += "<#assign text = text?replace('ɺ','r')>\n";
      str += "<#assign text = text?replace('ʇ','t')>\n";
      str += "<#assign text = text?replace('ʌ','v')>\n";
      str += "<#assign text = text?replace('ʍ','w')>\n";
      str += "<#assign text = text?replace('ʎ','y')>\n";
      str += "<#assign text = text?replace('ú','u')>\n";
      str += "<#assign text = text?replace('ŭ','u')>\n";
      str += "<#assign text = text?replace('ǔ','u')>\n";
      str += "<#assign text = text?replace('û','u')>\n";
      str += "<#assign text = text?replace('ṷ','u')>\n";
      str += "<#assign text = text?replace('ü','u')>\n";
      str += "<#assign text = text?replace('ǘ','u')>\n";
      str += "<#assign text = text?replace('ǚ','u')>\n";
      str += "<#assign text = text?replace('ǜ','u')>\n";
      str += "<#assign text = text?replace('ǖ','u')>\n";
      str += "<#assign text = text?replace('ṳ','u')>\n";
      str += "<#assign text = text?replace('ụ','u')>\n";
      str += "<#assign text = text?replace('ű','u')>\n";
      str += "<#assign text = text?replace('ȕ','u')>\n";
      str += "<#assign text = text?replace('ù','u')>\n";
      str += "<#assign text = text?replace('ủ','u')>\n";
      str += "<#assign text = text?replace('ư','u')>\n";
      str += "<#assign text = text?replace('ứ','u')>\n";
      str += "<#assign text = text?replace('ự','u')>\n";
      str += "<#assign text = text?replace('ừ','u')>\n";
      str += "<#assign text = text?replace('ử','u')>\n";
      str += "<#assign text = text?replace('ữ','u')>\n";
      str += "<#assign text = text?replace('ȗ','u')>\n";
      str += "<#assign text = text?replace('ū','u')>\n";
      str += "<#assign text = text?replace('ṻ','u')>\n";
      str += "<#assign text = text?replace('ų','u')>\n";
      str += "<#assign text = text?replace('ᶙ','u')>\n";
      str += "<#assign text = text?replace('ů','u')>\n";
      str += "<#assign text = text?replace('ũ','u')>\n";
      str += "<#assign text = text?replace('ṹ','u')>\n";
      str += "<#assign text = text?replace('ṵ','u')>\n";
      str += "<#assign text = text?replace('ᵫ','ue')>\n";
      str += "<#assign text = text?replace('ⱴ','v')>\n";
      str += "<#assign text = text?replace('ṿ','v')>\n";
      str += "<#assign text = text?replace('ʋ','v')>\n";
      str += "<#assign text = text?replace('ᶌ','v')>\n";
      str += "<#assign text = text?replace('ⱱ','v')>\n";
      str += "<#assign text = text?replace('ṽ','v')>\n";
      str += "<#assign text = text?replace('ẃ','w')>\n";
      str += "<#assign text = text?replace('ŵ','w')>\n";
      str += "<#assign text = text?replace('ẅ','w')>\n";
      str += "<#assign text = text?replace('ẇ','w')>\n";
      str += "<#assign text = text?replace('ẉ','w')>\n";
      str += "<#assign text = text?replace('ẁ','w')>\n";
      str += "<#assign text = text?replace('ⱳ','w')>\n";
      str += "<#assign text = text?replace('ẘ','w')>\n";
      str += "<#assign text = text?replace('ẍ','x')>\n";
      str += "<#assign text = text?replace('ẋ','x')>\n";
      str += "<#assign text = text?replace('ᶍ','x')>\n";
      str += "<#assign text = text?replace('ý','y')>\n";
      str += "<#assign text = text?replace('ŷ','y')>\n";
      str += "<#assign text = text?replace('ÿ','y')>\n";
      str += "<#assign text = text?replace('ẏ','y')>\n";
      str += "<#assign text = text?replace('ỵ','y')>\n";
      str += "<#assign text = text?replace('ỳ','y')>\n";
      str += "<#assign text = text?replace('ƴ','y')>\n";
      str += "<#assign text = text?replace('ỷ','y')>\n";
      str += "<#assign text = text?replace('ȳ','y')>\n";
      str += "<#assign text = text?replace('ẙ','y')>\n";
      str += "<#assign text = text?replace('ɏ','y')>\n";
      str += "<#assign text = text?replace('ỹ','y')>\n";
      str += "<#assign text = text?replace('ź','z')>\n";
      str += "<#assign text = text?replace('ž','z')>\n";
      str += "<#assign text = text?replace('ẑ','z')>\n";
      str += "<#assign text = text?replace('ʑ','z')>\n";
      str += "<#assign text = text?replace('ⱬ','z')>\n";
      str += "<#assign text = text?replace('ż','z')>\n";
      str += "<#assign text = text?replace('ẓ','z')>\n";
      str += "<#assign text = text?replace('ȥ','z')>\n";
      str += "<#assign text = text?replace('ẕ','z')>\n";
      str += "<#assign text = text?replace('ᵶ','z')>\n";
      str += "<#assign text = text?replace('ᶎ','z')>\n";
      str += "<#assign text = text?replace('ʐ','z')>\n";
      str += "<#assign text = text?replace('ƶ','z')>\n";
      str += "<#assign text = text?replace('ɀ','z')>\n";
      str += "<#assign text = text?replace('ﬁ','fi')>\n";
      str += "<#assign text = text?replace('ﬂ','fl')>\n";
      str += "<#assign text = text?replace('ĳ','ij')>\n";
      str += "<#assign text = text?replace('œ','oe')>\n";
      str += "<#assign text = text?replace('ₐ','a')>\n";
      str += "<#assign text = text?replace('ₑ','e')>\n";
      str += "<#assign text = text?replace('ᵢ','i')>\n";
      str += "<#assign text = text?replace('ₒ','o')>\n";
      str += "<#assign text = text?replace('ᵣ','r')>\n";
      str += "<#assign text = text?replace('ᵤ','u')>\n";
      str += "<#assign text = text?replace('ᵥ','v')>\n";
      str += "<#assign text = text?replace('ₓ','x')>\n";
      str += '<#return text>\n';
      str += '</#function>\n';
      return str;
    }

    function currencySymbol() {

      var JSONCurrency = {};
      search.create({
        type: 'currency',
        columns: ['name', 'symbol']
      }).run().each(function(line) {
        JSONCurrency[line.getValue('symbol')] = line.getValue('name');
        return true;
      });
      JSONCurrency = JSON.stringify(JSONCurrency);

      var str = '<#function getCurrencySymbol currency>\n';
      str += '<#assign currencyJson= ' + JSONCurrency + '>\n'
      str += '<#assign symbol = "" >\n'
      str += '<#list currencyJson?keys as key>\n'
      str += '<#if (currencyJson[key] =currency)>\n'
      str += '<#assign symbol = key >\n'
      str += '<#break>\n'
      str += '</#if>\n'
      str += '</#list>\n'
      str += '<#return symbol>\n'
      str += '</#function>\n'
      return str;
    }

    function setPadding() {
      var str = '';
      str += '<#function setPadding word position caracter quantity>\n';
      str += '<#assign input = word!"">\n';
      str += '<#assign c = " " >\n';
      str += '<#if ((""+caracter)?length > 0)>\n';
      str += '<#assign c = (""+caracter)?substring(0,1) >\n';
      str += '</#if>\n';
      str += '<#assign textSize = quantity-input?length>\n';
      str += '<#assign concat = "">\n';
      str += '<#if (textSize > 0)>\n';
      str += '<#list 1..textSize as x>\n';
      str += '<#assign concat += c>\n';
      str += '</#list>'
      str += '</#if>'
      str += '<#if (position=="left")>\n';
      str += '<#assign concat = concat + input>\n';
      str += '<#assign concat = concat?substring(0,quantity)>\n';
      str += '<#elseif (position=="right")>\n';
      str += '<#assign concat = input + concat>\n';
      str += '<#assign concat = concat?substring(concat?length-quantity,concat?length)>\n';
      str += '<#else>\n';
      str += '<#assign concat = input>\n';
      str += '</#if>\n';
      str += '<#return concat>\n';
      str += '</#function>\n';
      return str;
    }

    function onlyNumber() {

      var str = '';
      str += '<#function onlyNumber word >\n';
      str += '<#assign input = ""+word>\n';
      str += '<#assign input = input?replace("[^0-9]+", "", "r")>\n';
      str += '<#return input>\n';
      str += '</#function>\n';
      return str;
    }

    function create(content) {
      var str = '';
      str += builder();
      str += replaceLatinText();
      str += currencySymbol();
      str += getPeriod();
      str += setPadding();
      str += formatDate();
      str += formatCurrency();
      str += onlyNumber();
      str += content.replace(/<!--[\s\S]*?-->/g, '');
      return str;
    }

    function claveSolFormat() {

      var fileContent = file.load({
        id: '../format/LMRY_ClaveSol_Format.ftl'
      });
      fileContent = fileContent.getContents();

      return create(fileContent);

    }

    function bankFormat() {

      var fileContent = file.load({
        id: '../format/LMRY_BancoNacion_Format.ftl'
      });
      fileContent = fileContent.getContents();

      return create(fileContent);
    }

    return {
      claveSolFormat: claveSolFormat,
      bankFormat: bankFormat
    }

  });
