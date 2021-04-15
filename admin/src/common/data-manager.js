import axios from 'axios';
import Cookies from 'js-cookie';
import encrypter from 'object-encrypter';
import qs from 'qs';

import { Config } from './constants/config';
import { Methods } from './methods';
import {Notification} from "./index";

const engine = encrypter('2025afbe-8894-4261-9dd8-835b74ee4d76');
const user = engine.decrypt(Cookies.get('l_us')) || {};
const singleton = Symbol();
const singletonEnforcer = Symbol();

/**
 * DataManager is used trough instance and has the same methods as axios
 * DataManager.instance.get, DataManager.instance.put, DataManager.instance.post ...
 * it also has static create class that is used once on ligin when user data is available. DataManager.create.
 */
class DataManager {
  static DEFAULT_TIMEOUT = 10000;

  constructor(enforcer) {
    if (enforcer !== singletonEnforcer) {
      throw new Error('Cannot construct singleton');
    }
  }

  /**
   * access axios instance methots or your own customs trough this property
   */
  static get instance() {
    if (!this[singleton]) {
      const { userId, token, email } = user;
      DataManager.create({ });
    }
    return this[singleton];
  }

  /**
   * @param { * } headers used in axois requests
   */
  static create(headers) {
    this[singleton] = Object.assign(
      new DataManager(singletonEnforcer),
      axios.create({
        baseURL: Config.url,
        timeout: DataManager.DEFAULT_TIMEOUT,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-CSRFToken': Cookies.get('csrftoken'),
          // 'Accept-Encoding': 'gzip, deflate, br',
          Accept: '*/*',
          ...headers
        }
      })
    );
  }

  static destroy() {
    delete this[singleton];
  }

  resetPassword(email) {
    const data = { email, app: 'webapp-video-review' };

    return DataManager.instance.post('/resetpassword', qs.stringify(data));
  }

  getMessages(table) {
    const params = {
      approved: table.approved,
      pageSize: table.size,
      page: table.page
    };

    if (table.datetime) {
      if (table.timezone) {
        params.datetime = Methods.stringifyDate(table.datetime);
        params.timezone = table.timezone;
      } else {
        return new Promise(() => {
          throw 'Select timezone';
        });
      }
    }

    if (table.platform) {
      params.platform = table.platform;
    }

    if (table.language) {
      params.language = table.language;
    }

    return DataManager.instance
      .get('/paicoin/getannouncements', { params })
      .then(({ data }) => {
        return {
          data: data.content.announcements,
          messagesFiltered: data.content.filteredAnnouncementNumber,
          fetching: false
        };
      })
      .then(messages => {
        messages.data = messages.data.map(message => {
          message.available_from = new Date(message.available_from);
          message.available_to = new Date(message.available_to);
          return message;
        });

        return messages;
      })
      .then(messages => {
        messages.data = groupMessagesByDates(messages.data);
        return messages;
      });
  }

  postMessage(message) {
    const headers = { 'Content-Type': 'application/json',
        'X-CSRFToken': Cookies.get('csrftoken'),};

    if (message.id) {
      headers.id = message.id;
      delete message.id;
    }

    return DataManager.instance.post('/paicoin/announcement', message, { headers });
  }

    getAccountInfo(paiId) {
        const params = paiId ? { paiId } : {};

        return DataManager.instance.get(`/api/v1/account/get-info/${paiId}`, { params }).then(({ data }) => {
            console.table(data)
            if (data.name == null){
                data.name = data.email;
            }
            if (paiId) {
                return {
                    ...data,
                    paiId: paiId,
                    uuid: paiId,
                    firstName: data.name.split(' ')[0],
                    lastName: data.name.split(' ')[1],
                    email: data.email,
                    phone: data.phone,
                    fetching: false
                };
            } else {
                return null;
            }
        });


    }

  getReview(regions = [], paiId) {
    const params = paiId ? { paiId } : {};

    if (regions.length) {
      params.regions = `[${regions.map(region => region.value).join(',')}]`;
    }

    return DataManager.instance.get(`/api/v1/account/identity-verification/${paiId}`, { params }).then(({ data }) => {
      if (data.uuid) {
        return {
          ...data,
          urlVideo: data.videoUrl,
          paiId: data.uuid,
          uuid: data.uuid,
          submissionDate: new Date(data.submissionTimestamp),
          expectedSentence: data.words,
          birthDate: data.user.birthDate,
          gender: data.user.gender,
          firstName: data.fullName.split(' ')[0],
          lastName: data.fullName.split(' ')[1],
          noVideo: false,
          fetching: false
        };
      } else {
        return null;
      }
    });


  }

  postReview(review) {

    if (review.status === 'ACCEPTED') {

      return fetch(`${Config.url}/api/v1/account/identity-verification/${review.paiId}/accept`, {
        credentials: 'include',
        cache: 'no-cache',
        redirect: 'follow',
        method: 'POST',
        headers: {
           'Content-Type': 'application/json;charset=UTF-8',
            'X-CSRFToken': Cookies.get('csrftoken'),

        },
         body: JSON.stringify({ reason: review.rejectReason })
      })
        .then(res => {
          if (res.status === 422) {
            return res.json();
          } else if (res.status === 200) {
            return true;
          }
        })
        .catch(() => new Error('Something went wrong!'));
    } else {
      return fetch(`${Config.url}/api/v1/account/identity-verification/${review.paiId}/reject`, {
        credentials: 'include',
        cache: 'no-cache',
        redirect: 'follow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
            'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ reason: review.rejectReason })
      })
        .then(res => {
          if (res.status === 422) {
            return res.json();
          } else if (res.status === 200) {
            return true;
          }
        })
        .catch(() => new Error('Something went wrong!'));
    }
  }

    postAdminAccountChange(review) {
        if (review.status === 'PROMOTE') {
            return fetch(`${Config.url}/api/v1/account/admin-account-change/${review.paiId}/promote`, {
                credentials: 'include',
                cache: 'no-cache',
                redirect: 'follow',
                method: 'POST',
                 headers: {
                   'Content-Type': 'application/json;charset=UTF-8',
                     'X-CSRFToken': Cookies.get('csrftoken'),

                 },

            })
                .then(res => {
                    if (res.status === 422) {
                        return res.json();
                    } else if (res.status === 200) {
                        return true;
                    }
                })
                .catch(() => new Error('Something went wrong!'));
        } else if (review.status === 'DEMOTE') {
            return fetch(`${Config.url}/api/v1/account/admin-account-change/${review.paiId}/demote`, {
                credentials: 'include',
                cache: 'no-cache',
                redirect: 'follow',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-CSRFToken': Cookies.get('csrftoken'),
                },
            })
                .then(res => {
                    if (res.status === 422) {
                        return res.json();
                    } else if (res.status === 200) {
                        return true;
                    }
                })
                .catch(() => new Error('Something went wrong!'));
        } else if (review.status === 'DELETE') {
            return fetch(`${Config.url}/api/v1/account/admin-account-change/${review.paiId}/delete`, {
                credentials: 'include',
                cache: 'no-cache',
                redirect: 'follow',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-CSRFToken': Cookies.get('csrftoken'),
                },
            })
                .then(res => {
                    if (res.status === 422) {
                        return res.json();
                    } else if (res.status === 200) {
                        return true;
                    }
                })
                .catch(() => new Error('Something went wrong!'));{}
        } else {
            Notification.showError(`Unknown status ${review.status} in postAdminAccountChange...`);
        }
    }

}



// Helpers

// TODO BE should return these values like so...
function groupMessagesByDates(messages) {
  const results = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    message.platforms = new Set(message.platforms); // prepare platforms to be unique

    const group = results.find(byDate => {
      return (
        byDate.published.available_to.getTime() === message.available_to.getTime() &&
        byDate.published.available_from.getTime() === message.available_from.getTime()
      );
    });

    const { approved, content, id, language, timezone, title, available_from, available_to } = message;
    if (group) {
      // add to group
      message.platforms.forEach(platform => group.platforms.add(platform)); // update platforms
      if (group[language]) {
        group[language].push({ approved, content, id, language, timezone, title });
      } else {
        group[language] = [{ approved, content, id, language, timezone, title }];
      }
    } else {
      // create new group
      const result = {
        published: { available_from, available_to },
        platforms: message.platforms
      };
      result[language] = [{ approved, content, id, language, timezone, title, available_from, available_to }];
      results.push(result);
    }
  }

  return results;
}

export default DataManager;
