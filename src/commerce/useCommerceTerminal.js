import {useEffect,useMemo,useState} from 'react';
import {apiFetch,clearSession} from '../phase2Api';

const EMPTY_CUSTOMER={name:'',phone:''};
const EMPTY_PAYMENT={method:'CASH',reference:'',cashReceived:'',accountId:null};

export function useCommerceTerminal(){
  const [catalog,setCatalog]=useState({items:[],categories:[]});
  const [query,setQuery]=useState('');
  const [categoryId,setCategoryId]=useState('');
  const [loading,setLoading]=useState(false);
  const [cart,setCart]=useState([]);
  const [customer,setCustomer]=useState(EMPTY_CUSTOMER);
  const [payment,setPayment]=useState(EMPTY_PAYMENT);
  const [discount,setDiscount]=useState('0');
  const [notice,setNotice]=useState(null);
  const [submitting,setSubmitting]=useState(false);
  const [completed,setCompleted]=useState(null);
  return{catalog,query,categoryId,loading,cart,customer,payment,discount,notice,submitting,completed,setCatalog,setQuery,setCategoryId,setLoading,setCart,setCustomer,setPayment,setDiscount,setNotice,setSubmitting,setCompleted};
}
