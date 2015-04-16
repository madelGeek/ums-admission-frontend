'use strict';

angular.module('admissionSystemApp')
  .constant('_', window._);

angular.module('admissionSystemApp')
  .factory('Person', ['Restangular', '$q', '$filter',
    function (Restangular, $q, $filter) {

      var restAngular =
        Restangular.withConfig(function (Configurer) {
          Configurer.setBaseUrl('http://104.236.29.16:8080/is-lnu-rest-api/api/');
          Configurer.setDefaultHeaders({
            Authorization: 'Basic YWRtaW46bmltZGE='
          });
          Configurer.addResponseInterceptor(function (data, operation) {
            if (operation === 'get') {
              delete data.uri;
            }
            if (operation === 'getList') {
              return data.resources;
            } else {
              return data;
            }
          });
          Configurer.setRequestInterceptor(function (element, operation) {
            if (operation === 'post' || operation === 'put') {
              element.begDate = $filter('date')(element.begDate, 'yyyy-MM-dd');
              element.endDate = $filter('date')(element.endDate, 'yyyy-MM-dd');
              delete element.uri;
            }
            return element;
          });
        });


      var objCopy = {};

      function getEntirePerson(id) {
        var entirePerson = {};
        entirePerson.person = restAngular.one('persons', id).get();
        entirePerson.addresses = restAngular.one('persons', id).one('addresses').getList();
        entirePerson.contacts = restAngular.one('persons', id).one('contacts').getList();
        entirePerson.names = restAngular.one('persons', id).one('names').getList();
        entirePerson.papers = restAngular.one('persons', id).one('papers').getList();
        entirePerson.awards = restAngular.one('persons', id).one('awards').getList();
        entirePerson.enrolmentsubjects = restAngular.one('persons', id).one('enrolmentsubjects').getList();

        $q.all(entirePerson).then(function (res) {
          _.merge(objCopy, res);
        });
        return $q.all(entirePerson);
      }

      function addArrayOfItems(itemsArr, personId, route) {
        var promises = [];
        for (var i = 0; i < itemsArr.length; i += 1) {
          itemsArr[i].personId = personId;
          var newPromise = restAngular.one('persons', personId).one(route).post('', itemsArr[i]);
          promises.push(newPromise);
        }
        return $q.all(promises);
      }

      function addEntirePerson(obj) {
        var id = $q.defer();
        restAngular.all('persons').post(obj.person).then(function (response) {
          id.resolve(response.id);
        });
        return id.promise;
      }

      function addOrEditPerson(currentObj) {
        if (!objCopy.person) {
          return addEntirePerson(currentObj).then(function (personId) {
            currentObj.person.id = personId;
            return $q.all([
              addArrayOfItems(currentObj.addresses, personId, 'addresses'),
              addArrayOfItems(currentObj.contacts, personId, 'contacts'),
              addArrayOfItems(currentObj.names, personId, 'names'),
              addArrayOfItems(currentObj.papers, personId, 'papers'),
              addArrayOfItems(currentObj.awards, personId, 'awards'),
              addArrayOfItems(currentObj.enrolmentsubjects, personId, 'enrolmentsubjects')
            ])
              .then(function () {
                return getEntirePerson(personId).then(function (newEntirePerson) {
                  _.merge(currentObj, newEntirePerson);
                });
              });
          });
        } else {
          return editEntirePerson(currentObj);
        }
      }

      function editEntirePerson(newObj) {
        var personId = objCopy.person.id;
        var promisePerson;
        if (!angular.equals(newObj.person, objCopy.person)) {
          promisePerson = restAngular.one('persons', personId).customPUT(newObj.person);
        }

        return $q.all([
          compareArrays(newObj.addresses, objCopy.addresses, personId, 'addresses'),
          compareArrays(newObj.contacts, objCopy.contacts, personId, 'contacts'),
          compareArrays(newObj.names, objCopy.names, personId, 'names'),
          compareArrays(newObj.papers, objCopy.papers, personId, 'papers'),
          compareArrays(newObj.awards, objCopy.awards, personId, 'awards'),
          compareArrays(newObj.enrolmentsubjects, objCopy.enrolmentsubjects, personId, 'enrolmentsubjects'),
          promisePerson
        ])
          .then(function () {
            return getEntirePerson(personId).then(function (res) {
              _.merge(newObj, res);
            });
          });
      }

      function compareArrays(newArr, oldArr, personId, route) {
        /* - if item doesn't have id property - POST NEW item.
         - else check if item correspond the items with same ID in oldAdd. If false - PUT it.
         - check if there are there are deleted items  */
        var promises = [];

        _.forEach(newArr, function (item) {
          var promise;
          if (!item.personId) {
            item.personId = personId;
            promise = restAngular.one('persons', personId).one(route).customPOST(item);
            promises.push(promise);
          } else {
            var oldItem = _.find(oldArr, {
              'id': item.id
            });
            if (!angular.equals(oldItem, item)) {
              promise = restAngular.one('persons', personId).one(route, oldItem.id).customPUT(item);
              promises.push(promise);
            }
          }
        });

        _.forEach(oldArr, function (item) {
          var promise;
          if (!_.some(newArr, {
              'id': item.id
            })) {
            promise = restAngular.one('persons', personId).one(route, item.id).remove();
            promises.push(promise);
          }
        });

        return $q.all(promises);
      }

      function deletePerson(objToDelete) {
        var promises = [];
        var personId = objToDelete.person.id;

        promises.push(restAngular.one('persons', personId).remove());

        _.forEach(objToDelete.addresses, function (address) {
          promises.push(restAngular.one('persons', personId).one('addresses', address.id).remove());
        });

        _.forEach(objToDelete.contacts, function (contact) {
          promises.push(restAngular.one('persons', personId).one('contacts', contact.id).remove());
        });

        _.forEach(objToDelete.names, function (name) {
          promises.push(restAngular.one('persons', personId).one('names', name.id).remove());
        });

        _.forEach(objToDelete.papers, function (paper) {
          promises.push(restAngular.one('persons', personId).one('papers', paper.id).remove());
        });

        _.forEach(objToDelete.awards, function (award) {
          promises.push(restAngular.one('persons', personId).one('awards', award.id).remove());
        });

        _.forEach(objToDelete.enrolmentsubjects, function (enrolmentsubject) {
          promises.push(restAngular.one('persons', personId).one('enrolmentsubjects', enrolmentsubject.id).remove());
        });

        return $q.all(promises).then(function () {
          objCopy = {};
        });
      }

      function deleteEntirePerson(objToDelete, id) {
        if (!objToDelete.person) {
          return getEntirePerson(id).then(deletePerson);
        } else {
          return deletePerson(objToDelete);
        }
      }


      return {
        getEntirePerson: getEntirePerson,

        addOrEditPerson: addOrEditPerson,

        deleteEntirePerson: function (id) {
          return deleteEntirePerson(objCopy, id);
        }
      };
    }]);