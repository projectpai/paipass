import React, { Children, useEffect, useState, ReactNode } from "react";

import { negotiateLanguages } from "@fluent/langneg";
import { FluentBundle, FluentResource } from "@fluent/bundle";
import { ReactLocalization, LocalizationProvider } from "@fluent/react";

// Parcel decorates filenames with cache-busting hashes.

import en_US from "./assets/l10n/en-US.ftl"
import zh_CN from "./assets/l10n/zh-CN.ftl"
const ftl = {'en-US': en_US,
            'zh-CN': zh_CN};


const DEFAULT_LOCALE = "en-US";
const AVAILABLE_LOCALES = {
  "en-US": "English",
  "zh-CN": "中文",
};

async function fetchMessages(locale) {
  let response = await fetch(ftl[locale]);
  let messages = await response.text();
  return [locale, messages];
}

function* lazilyParsedBundles(fetchedMessages) {
  for (let [locale, messages] of fetchedMessages) {
    let resource = new FluentResource(messages);
    let bundle = new FluentBundle(locale);
    bundle.addResource(resource);
    yield bundle;
  }
}

function AppLocalizationProvider(props) {
  let [currentLocales, setCurrentLocales] = useState([DEFAULT_LOCALE]);
  let [l10n, setL10n] = useState(null);
  useEffect(() => {
    changeLocales(navigator.languages);
  }, []);

  async function changeLocales(userLocales) {
    let currentLocales = negotiateLanguages(
      userLocales,
      Object.keys(AVAILABLE_LOCALES),
      { defaultLocale: DEFAULT_LOCALE }
    );
    setCurrentLocales(currentLocales);

    let fetchedMessages = await Promise.all(
      currentLocales.map(fetchMessages)
    );

    let bundles = lazilyParsedBundles(fetchedMessages);
    setL10n(new ReactLocalization(bundles));
  }



  if (l10n === null) {
    return <div>Loading…</div>;
  }

  const isInIframe = window.top !== window.self

  let selectComponent = null;
  let hrComp = null;
  if (!isInIframe) {
    selectComponent = <select
      onChange={event => changeLocales([event.target.value])}
      value={currentLocales[0]}>
      {Object.entries(AVAILABLE_LOCALES).map(
        ([code, name]) => <option key={code} value={code}>{name}</option>
      )}
    </select>;
    hrComp = <hr />
  }




  return <>
    <LocalizationProvider l10n={l10n}>
      {Children.only(props.children)}
    </LocalizationProvider>
    {selectComponent}
    {hrComp}
  </>;
  // return <>
  //   <div>
  //   {props.children}
  //   </div>
  //   <hr/>
  //   </>;
}
export default AppLocalizationProvider;