import { sendRequest } from "@/javascript/utils/axiosUtils";
import { CodeParser } from "@/javascript/codeParser/CodeParser";

export default {
  namespaced: true,
  state: {
    id: null,
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n\tcout << "Hello world" << endl;\n}',
    language: 'cpp',
    breakpoints: new Map(),
    testData: [{input: ''}],
    sceneObjects: [],
    isRunning: false,
    selectedTestCaseId: 0,
    selectedFrameId: 0,
  },

  getters: {
    variables(state) { // TODO: zrefaktoryzować
      let variables = new Map();
      for (let sceneObject of state.sceneObjects) {
        if (sceneObject.variable) {
          sceneObject.variable.id = sceneObject.variable.name;
          variables.addElement(sceneObject.variable);
        }
        
        for (let subobject of sceneObject.subobjects) {
          if (subobject.variable) {
            subobject.variable.id = subobject.variable.name;
            variables.addElement(subobject.variable);
          }
          
        }
      }
      return variables;
    },
  
    converters(state) {  // TODO: zrefaktoryzować
      let converters = new Map();
        for (let sceneObject of state.sceneObjects) {
          if (sceneObject.converter) {
            converters.addElement(sceneObject.converter);
          }
          
          for (let subobject of sceneObject.subobjects) {
            if (subobject.converter) {
              converters.addElement(subobject.converter);
            }
          }
        }
        return converters;
    },

    debugCode(state, getters) {
      return new CodeParser(state.code, getters.variables, state.breakpoints, getters.converters).parse();
    },

    sceneObjects(state) {
      return state.sceneObjects.map((element, index) => ({...element, index}));
    },

    testData(state) {
      return state.testData.map((element, index) => ({...element, index}));
    },

    numberOfTestCases(_, getters) {
      return getters.testData.length;
    },

    currentTestCase(state, getters) {
      return getters.testData[state.selectedTestCaseId];
    },

    currentFrames(_, getters) {
      return getters.currentTestCase.frames.map((element, index) => ({...element, index}));
    },
  
    currentFrame(state, getters) {
      return getters.currentFrames[state.selectedFrameId];
    },

    numberOfFrames(_, getters) {
      return getters.currentFrames.length;
    }

  },

  mutations: {
    set(state, {key, value}) {
      state[key] = value;
    },

    addTestCase(state) {
      state.testData.push({input: ''});
    }, 

    deleteTestCase(state, index) {
      state.testData.splice(index, 1);
    },

    changeCurrentTestCase(state, index) {
      state.selectedTestCaseId = index;
    },
  
    changeCurrentFrame(state, index) {
      state.selectedFrameId = index;
    },

    updateCurrentTestCaseInput(state, newValue) {
      state.testData[state.selectedTestCaseId].input = newValue
    },

    deleteSceneObject(state, index) {
      state.sceneObjects.splice(index, 1);
    },

    setProject(state, project) { // TODO: Dynamiczne przepisywanie
      state.id = project.id;
      state.code = project.code;
      state.breakpoints = new Map(project.breakpoints.map(breakpoint => {
        return [breakpoint.id, breakpoint];
      })); // TODO: array -> map/set
      state.language = project.language;
      state.testData = project.testCases;
      state.sceneObjects = project.sceneObjects;
      state.title = project.title;
    },

    addOutputs(state, outputs) {
      for (let i in state.testData) {
        state.testData[i] = {
          ...state.testData[i],
          ...outputs[i].output,
        };
      }
    },

    updateSceneObjectPosition(state, {sceneObject, position}) {
      state.sceneObjects[sceneObject.index].position = position;
    },

    updateSceneObject(state, sceneObject) {
      state.sceneObjects[sceneObject.index] = sceneObject;
    },

    addNewSceneObject(state, sceneObject) {
      state.sceneObjects.push(sceneObject)
    }
  },

  actions: {
    setIsRunning: ({commit}, newValue) => commit('set', {key: 'isRunning', value: newValue}), 
    setCode: ({commit}, newValue) => commit('set', {key: 'code', value: newValue}), 
    addTestCase: ({commit}) => commit('addTestCase'), 
    deleteTestCase: ({commit}, index) => commit('deleteTestCase', index), 
    changeCurrentTestCase: ({commit}, index) => commit('changeCurrentTestCase', index), 
    changeCurrentFrame: ({commit}, index) => commit('changeCurrentFrame', index),
    updateCurrentTestCaseInput: ({commit}, newValue) => {commit('updateCurrentTestCaseInput', newValue)}, 
    deleteSceneObject: ({commit}, index) => commit('deleteSceneObject', index),
    updateSceneObjectPosition: ({commit}, payload) => commit('updateSceneObjectPosition', payload),

    saveSceneObject({commit}, sceneObject) {
      commit(sceneObject.index != null ? 'updateSceneObject' : 'addNewSceneObject', sceneObject);
    },

    loadProject({commit}, projectId) {
      sendRequest('/project/find/' + projectId, null, 'GET')
        .then((responseData) => {
          commit('setProject', responseData)
        })
    },

    saveProject({commit, state}, {title, override}) {
      sendRequest("/project/save", {
        id: override ? state.id : null,
        title: title,
        language: state.language,
        code: state.code,
        breakpoints: state.breakpoints.toArray(), // TODO: save as map
        testCases: state.testData,
        sceneObjects: state.sceneObjects
      }, 'PUT')
        .then((responseData) => {
          commit('set', {key: 'id', value: responseData.id});
          commit('set', {key: 'title', value: responseData.title});
        })
    },

    compile({commit, state, getters}) {
      const inputs = state.testData.map(testCase => testCase.input)
      return sendRequest('/compilator/compile', {
        code:     getters.debugCode,
        language: "cpp",
        inputs:    inputs
      }, 'POST')
        .then((responseData) => {
          if (!responseData.success) return false;
          commit('addOutputs', responseData.details);
          commit('set', {key: 'isRunning', value: true});
          return true;
        });
    }
  }
}