import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllTags = () => axios.get(`${BASE_URL}/tags`);
export const getTagById = (id) => axios.get(`${BASE_URL}/tags/id/${id}`);
export const getTagByName = (name) => axios.get(`${BASE_URL}/tags/name/${name}`);
export const createTag = (tagData) => axios.post(`${BASE_URL}/tags`, tagData);
export const deleteTag = (id) => axios.delete(`${BASE_URL}/tags/${id}`);